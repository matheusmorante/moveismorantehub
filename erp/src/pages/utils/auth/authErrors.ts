export const translateAuthError = (message: string): string => {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('invalid login credentials') ||
    lowerMessage.includes('invalid_credentials')
  ) {
    return 'E-mail ou senha incorretos. Por favor, verifique seus dados.';
  }

  if (lowerMessage.includes('email not confirmed')) {
    return 'Seu e-mail ainda não foi confirmado. Por favor, verifique sua caixa de entrada.';
  }

  if (lowerMessage.includes('user already registered')) {
    return 'Este e-mail já está cadastrado no sistema.';
  }

  if (lowerMessage.includes('password should be at least 6 characters')) {
    return 'A senha deve ter pelo menos 6 caracteres.';
  }

  if (lowerMessage.includes('too many requests') || lowerMessage.includes('rate limit exceeded')) {
    return 'Limite de e-mails atingido por agora. Por favor, aguarde alguns minutos ou faça login se já tiver conta.';
  }

  if (lowerMessage.includes('network error') || lowerMessage.includes('failed to fetch')) {
    return 'Erro de conexão. Verifique sua internet ou se o servidor está online.';
  }

  return message || 'Ocorreu um erro inesperado na autenticação.';
};
