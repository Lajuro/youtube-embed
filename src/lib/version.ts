import pkg from "../../package.json";

/**
 * Versão do app (vem do package.json). Aparece no rodapé das Configurações e no
 * instalador — útil para conferir se a atualização realmente entrou.
 */
export const APP_VERSION: string = pkg.version;
