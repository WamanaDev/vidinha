// SUPOSIÇÃO: o Pluggy Connect é um widget web (react-pluggy-connect, baseado
// em iframe/React DOM), sem SDK nativo para React Native. Não há confirmação
// absoluta, nesta base de código, da URL exata do widget standalone hospedado
// pela Pluggy — o padrão geral documentado publicamente pela Pluggy é
// `https://connect.pluggy.ai/?connectToken=<token>`. Isolado aqui, em um único
// lugar, para ser fácil de corrigir depois de validar com uma conta real do
// Pluggy (dashboard/sandbox) qual é a URL definitiva (pode variar entre
// ambiente sandbox/produção, ou exigir parâmetros adicionais como `theme`,
// `includeSandbox`, `updateItem`, etc).
export function buildPluggyConnectWidgetUrl(connectToken: string): string {
  return `https://connect.pluggy.ai/?connectToken=${encodeURIComponent(connectToken)}`;
}

// SUPOSIÇÃO: o widget do Pluggy Connect comunica sucesso/erro/fechamento via
// `window.postMessage` no contexto web (confirmado pela documentação pública
// do `react-pluggy-connect`, que expõe callbacks `onSuccess({ item })`,
// `onError(error)` e `onClose()` — dentro de uma WebView isso não existe
// nativamente, então precisamos escutar `message` no `window` da página e
// repassar para o React Native). O formato exato do payload postado
// (nome dos campos dentro de `item`, como `item.id`) não está 100% confirmado
// sem testar com uma conta real — o parsing abaixo tenta os formatos mais
// prováveis e cai em erro genérico se não reconhecer nada.
export const PLUGGY_WIDGET_INJECTED_JAVASCRIPT = `
(function () {
  function post(payload) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  window.addEventListener('message', function (event) {
    try {
      var data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          // não era JSON — ignora, pode ser mensagem de outra origem
          return;
        }
      }
      if (!data || typeof data !== 'object') return;

      // SUPOSIÇÃO: nomes de evento/campo prováveis do widget Pluggy Connect —
      // ajustar assim que confirmado com o widget real.
      var eventName = data.event || data.type;
      if (eventName === 'SUCCESS' || eventName === 'success') {
        var itemId = (data.item && data.item.id) || data.itemId;
        if (itemId) {
          post({ type: 'SUCCESS', itemId: itemId });
        }
      } else if (eventName === 'ERROR' || eventName === 'error') {
        post({ type: 'ERROR', message: data.message });
      } else if (eventName === 'CLOSE' || eventName === 'close') {
        post({ type: 'CLOSE' });
      }
    } catch (err) {
      // nunca deixa o script injetado quebrar a página do widget
    }
  });

  true;
})();
`;
