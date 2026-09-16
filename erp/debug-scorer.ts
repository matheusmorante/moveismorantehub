import { 
    InboundDeterministicScorerContext, 
    rankAndScoreDeterministic
} from './src/pages/utils/inboundNfe/services/inboundDeterministicScorer';

const catalog = [{ id: 'NEW_XANGAI', name: 'Guarda Roupa Doripel New Xangai 6 Portas 2 Gavetas Off White Nogueira', code: '', price: 0, variations: [] }];
const context = new InboundDeterministicScorerContext(catalog);
const result = rankAndScoreDeterministic('G ROUPA DORIPEL NEW XANGAI 6PT 2GV MDF OFF WHITE/NOGUEIRA', undefined, context);

console.log("IDF Map:", Object.fromEntries(context.idf));
console.log(JSON.stringify(result, null, 2));
