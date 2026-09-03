/**
 * O backend sempre responde erros no formato { error: { message, details } }
 * (ver errorHandler.middleware.js). Esta função extrai a mensagem certa
 * em qualquer cenário (erro da API, erro de rede, erro inesperado).
 */
export function extractErrorMessage(error, fallback = 'Ocorreu um erro. Tente novamente.') {
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  if (error?.response?.data?.error?.details?.length) {
    return error.response.data.error.details.map((d) => d.mensagem || d.msg).join(' ');
  }
  if (error?.message === 'Network Error') {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  }
  return fallback;
}
