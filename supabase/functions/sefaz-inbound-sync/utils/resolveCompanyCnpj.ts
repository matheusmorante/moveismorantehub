export async function resolveCompanyCnpj(
  supabaseClient: any,
  requestedCnpj: any,
  configuredCnpj: string | undefined,
): Promise<string> {
  let cnpj = requestedCnpj || configuredCnpj || "";

  if (!cnpj) {
    const { data: settingsData, error: settingsError } = await supabaseClient
      .from("settings")
      .select("data")
      .eq("id", "app")
      .single();

    if (!settingsError && settingsData?.data) {
      const d = settingsData.data;
      if (!cnpj && d.companyCnpj) cnpj = d.companyCnpj;
    }
  }

  const cleanCnpj = cnpj.replace(/\D/g, "");

  if (!cleanCnpj) {
    throw new Error("CNPJ da empresa emitente não configurado.");
  }

  return cleanCnpj;
}
