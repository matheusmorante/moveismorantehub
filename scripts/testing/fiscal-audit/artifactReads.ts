import { createClient } from '@supabase/supabase-js';
import { excludeTestOrders, NON_TEST_ARTIFACT_FILTER } from '../../../shared-utils/testArtifactQueries';

export async function testArtifactPostgrestReads() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const email = process.env.NFE_HML_TEST_OPERATOR_EMAIL?.trim().toLowerCase() || '';
  const password = process.env.NFE_HML_TEST_OPERATOR_PASSWORD || '';
  const projectRef = (() => {
    try { return new URL(url).hostname.split('.')[0]; } catch { return ''; }
  })();
  const projectMatches = projectRef === 'hkoxhourxwlddgsfdgws';
  const vercelDevelopment = process.env.VERCEL_ENV === 'development';
  const environmentOk = vercelDevelopment;
  const credentialsPresent = Boolean(anonKey && email && password);
  if (!projectMatches || !environmentOk || !credentialsPresent) {
    console.log(JSON.stringify({mode:'artifact-reads',projectMatches,vercelDevelopment,
      environmentOk,operatorEmailPresent:Boolean(email),
      credentialsPresent,authenticated:false,administratorCheckOk:false,queriesValid:false}));
    process.exitCode = 1;
    return;
  }

  const operator = createClient(url, anonKey, {auth:{persistSession:false,autoRefreshToken:false}});
  const login = await operator.auth.signInWithPassword({email,password});
  const authenticatedIdentityMatches = !login.error && Boolean(login.data.session) &&
    login.data.user?.email?.trim().toLowerCase() === email;
  if (!authenticatedIdentityMatches) {
    console.log(JSON.stringify({mode:'artifact-reads',projectRef,environment:2,operatorEmailPresent:true,
      authenticated:false,authenticatedIdentityMatches:false,administratorCheckOk:false,queriesValid:false}));
    process.exitCode = 1;
    return;
  }

  try {
    const role = await operator.rpc('is_administrator');
    const administratorCheckOk = !role.error && role.data === true;
    if (!administratorCheckOk) {
      console.log(JSON.stringify({mode:'artifact-reads',projectRef,environment:2,operatorEmailPresent:true,
        authenticated:true,authenticatedIdentityMatches:true,administratorCheckOk:false,queriesValid:false}));
      process.exitCode = 1;
      return;
    }

    const orderCountQuery = () => operator.from('orders').select('id',{count:'exact',head:true});
    const markedTestFilter = 'order_data->>is_test.eq.true,order_data->>isTest.eq.true,order_data->testArtifact->>is_test.eq.true';
    const countRows = async (build: () => any) => {
      try {
        const {count,error} = await build();
        return {count:error ? null : count ?? 0,errorCode:error?.code || null};
      } catch {
        return {count:null,errorCode:'POSTGREST_QUERY_FAILED'};
      }
    };
    const destinations = [
      {
        name:'sales-report',
        raw:() => orderCountQuery().is('order_data->deleted',null),
        filtered:() => excludeTestOrders(orderCountQuery()).is('order_data->deleted',null),
      },
      {
        name:'stock-report',
        raw:() => orderCountQuery().eq('deleted',false).neq('order_type','budget'),
        filtered:() => excludeTestOrders(orderCountQuery()).eq('deleted',false).neq('order_type','budget'),
      },
      {
        name:'delivery-schedule',
        raw:() => orderCountQuery().or('deleted.is.null,deleted.eq.false').in('status',['scheduled','draft']),
        filtered:() => excludeTestOrders(orderCountQuery())
          .or('deleted.is.null,deleted.eq.false').in('status',['scheduled','draft']),
      },
      {
        name:'assembly-list',
        raw:() => orderCountQuery()
          .or('order_data->>deleted.is.null,order_data->>deleted.eq.false'),
        filtered:() => excludeTestOrders(orderCountQuery())
          .or('order_data->>deleted.is.null,order_data->>deleted.eq.false')
          .or('order_data->>is_test.is.null,order_data->>is_test.eq.false'),
      },
      {
        name:'assembly-print',
        raw:() => orderCountQuery().eq('deleted',false).neq('status','cancelled'),
        filtered:() => excludeTestOrders(orderCountQuery()).eq('deleted',false).neq('status','cancelled'),
      },
      {
        name:'dashboard-period',
        raw:() => orderCountQuery().gte('created_at','2026-10-05T00:00:00.000Z')
          .lte('created_at','2026-10-11T23:59:59.000Z'),
        filtered:() => excludeTestOrders(orderCountQuery())
          .gte('created_at','2026-10-05T00:00:00.000Z').lte('created_at','2026-10-11T23:59:59.000Z'),
      },
      {
        name:'dashboard-recent-and-map',
        raw:() => orderCountQuery().in('status',['scheduled','fulfilled'])
          .or('deleted.is.null,deleted.eq.false'),
        filtered:() => excludeTestOrders(orderCountQuery()).in('status',['scheduled','fulfilled'])
          .or('deleted.is.null,deleted.eq.false'),
      },
      {
        name:'notification-order-read',
        raw:() => orderCountQuery(),
        filtered:() => excludeTestOrders(orderCountQuery()),
      },
    ];
    const destinationResults: Array<Record<string,unknown>> = [];
    for (const destination of destinations) {
      const raw = await countRows(destination.raw);
      const filtered = await countRows(destination.filtered);
      const marked = await countRows(() => destination.raw().or(markedTestFilter));
      const leaked = await countRows(() => destination.filtered().or(markedTestFilter));
      // Independent requests can observe concurrent operational writes; marker leaks are the invariant.
      const queryValid = raw.count !== null && filtered.count !== null && marked.count !== null && leaked.count === 0;
      destinationResults.push({name:destination.name,rawCount:raw.count,filteredCount:filtered.count,
        excludedCount:raw.count !== null && filtered.count !== null ? raw.count-filtered.count : null,
        markedCandidateCount:marked.count,leakedTestCount:leaked.count,behaviorExercised:(marked.count ?? 0)>0,
        queryValid,errorCode:raw.errorCode || filtered.errorCode || marked.errorCode || leaked.errorCode || null});
    }

    const activeStatusProofs: Array<Record<string,unknown>> = [];
    for (const status of ['scheduled','fulfilled']) {
      const marked = await countRows(() => orderCountQuery().eq('status',status)
        .or('deleted.is.null,deleted.eq.false').or(markedTestFilter));
      const leaked = await countRows(() => excludeTestOrders(orderCountQuery()).eq('status',status)
        .or('deleted.is.null,deleted.eq.false').or(markedTestFilter));
      activeStatusProofs.push({status,markedCandidateCount:marked.count,leakedTestCount:leaked.count,
        behaviorExercised:(marked.count ?? 0)>0,queryValid:marked.count !== null && leaked.count === 0,
        errorCode:marked.errorCode || leaked.errorCode || null});
    }

    const contradictoryTestCount = await countRows(() => orderCountQuery()
      .or(NON_TEST_ARTIFACT_FILTER)
      .or(markedTestFilter));
    const limitedRows = await operator.from('orders')
      .select('is_test:order_data->>is_test,isTest:order_data->>isTest,nested_test:order_data->testArtifact->>is_test')
      .or(NON_TEST_ARTIFACT_FILTER)
      .in('status',['scheduled','fulfilled'])
      .or('deleted.is.null,deleted.eq.false')
      .order('created_at',{ascending:false})
      .limit(50);
    const limitedLeakCount = limitedRows.error ? null : (limitedRows.data || []).filter((row:any) =>
      [row.is_test,row.isTest,row.nested_test].some(value => value === true || value === 'true')
    ).length;
    const queriesValid = destinationResults.every(result => result.queryValid === true) &&
      activeStatusProofs.every(result => result.queryValid === true) &&
      contradictoryTestCount.count === 0 && contradictoryTestCount.errorCode === null &&
      limitedLeakCount === 0 && !limitedRows.error;
    console.log(JSON.stringify({mode:'artifact-reads',projectRef,environment:2,operatorEmailPresent:true,
      authenticated:true,authenticatedIdentityMatches:true,administratorCheckOk:true,
      sourceFilterAppliedBeforeLimit:true,destinations:destinationResults,
      activeStatusProofs,activeStatesExercised:activeStatusProofs.every(result => result.behaviorExercised === true),
      contradictoryTestCount,limitedRowsReturned:limitedRows.data?.length ?? null,limitedLeakCount,queriesValid}));
    if (!queriesValid) process.exitCode = 1;
  } finally {
    await operator.auth.signOut({scope:'local'});
  }
}
