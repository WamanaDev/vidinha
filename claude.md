# VIDINHA

## Especificação Geral do Produto, Arquitetura, Segurança e Padrões Técnicos

**Status:** Documento inicial de definição
**Produto:** Vidinha
**Plataforma:** Mobile-first
**Público-alvo:** Casais e famílias
**Backend:** NestJS + Prisma + GraphQL
**Frontend/App:** React Native + Expo + TypeScript
**Integração financeira:** Open Finance

---

# 1. Visão do Produto

## 1.1 O que é o Vidinha?

O **Vidinha** é um aplicativo de gestão financeira compartilhada, desenvolvido para casais e famílias que desejam organizar suas finanças de forma simples, transparente e colaborativa.

O aplicativo permitirá que duas ou mais pessoas compartilhem a gestão de determinadas informações financeiras, possibilitando uma visão consolidada das finanças da família sem necessariamente compartilhar toda a movimentação financeira individual.

Por meio da integração com **Open Finance**, os usuários poderão conectar suas contas bancárias e cartões e visualizar essas informações dentro do Vidinha.

Além das informações obtidas por meio do Open Finance, os usuários poderão cadastrar e acompanhar despesas e compromissos compartilhados, como:

- Aluguel;
- Condomínio;
- Energia;
- Internet;
- Supermercado;
- Escola;
- Assinaturas;
- Contas domésticas;
- Outras despesas compartilhadas.

A proposta central é criar uma camada de **organização e inteligência financeira sobre as contas que os usuários já possuem**.

---

# 2. Problema

Casais e famílias frequentemente possuem:

- Mais de uma conta bancária;
- Cartões em diferentes instituições;
- Despesas individuais e compartilhadas;
- Contas recorrentes;
- Diferentes fontes de renda;
- Necessidade de dividir responsabilidades financeiras.

Isso pode fazer com que a gestão financeira fique distribuída entre aplicativos bancários, cartões, planilhas e anotações.

O Vidinha busca centralizar essa visão e permitir que as pessoas tenham uma compreensão mais clara da **vida financeira compartilhada**.

---

# 3. Proposta de Valor

O Vidinha pretende oferecer:

### Centralização

Reunir informações financeiras de diferentes instituições em um único aplicativo.

### Compartilhamento

Permitir que pessoas de uma mesma família gerenciem informações financeiras compartilhadas.

### Organização

Organizar receitas, despesas, contas e compromissos financeiros.

### Transparência

Permitir que os usuários tenham uma visão compartilhada daquilo que decidiram administrar em conjunto.

### Personalização

Cada família poderá definir o que deseja compartilhar e como deseja organizar suas finanças.

---

# 4. Open Finance

O Vidinha terá integração com **Open Finance** para permitir a vinculação de contas financeiras dos usuários.

O objetivo descrito atualmente é utilizar essas integrações para:

- Vincular contas bancárias;
- Vincular cartões;
- Obter informações financeiras autorizadas pelo usuário;
- Centralizar essas informações dentro do Vidinha;
- Utilizar os dados para organização financeira.

## Ponto a definir

**A DEFINIR:** qual provedor/instituição será utilizado para realizar a integração com o Open Finance?

Exemplos de decisões que precisam ser tomadas:

- Será utilizado um agregador de Open Finance?
- Haverá integração direta?
- Qual fornecedor será utilizado?
- Quais instituições financeiras serão suportadas inicialmente?
- Quais tipos de dados serão importados?
- Qual será a frequência de sincronização?
- Como será realizado o consentimento?
- Como o consentimento poderá ser revogado?

Essas decisões são fundamentais antes da implementação definitiva dessa parte da arquitetura.

---

# 5. Modelo de Compartilhamento

O diferencial do Vidinha é permitir uma gestão financeira compartilhada.

Um usuário poderá conectar suas próprias instituições financeiras e, posteriormente, compartilhar determinadas informações com outra pessoa.

O modelo exato de compartilhamento ainda precisa ser especificado.

## A DEFINIR

Precisamos definir:

1. O que é uma “família” dentro do sistema?
2. Quantas pessoas podem participar de uma família?
3. O produto será exclusivamente para duas pessoas ou poderá ter mais integrantes?
4. Quem cria a família?
5. Existe proprietário/administrador da família?
6. Quais permissões cada integrante possui?
7. Uma pessoa pode participar de mais de uma família?
8. O usuário pode escolher conta por conta o que será compartilhado?
9. O usuário pode escolher cartão por cartão?
10. É possível compartilhar somente determinadas categorias de despesas?
11. É possível ocultar uma movimentação específica?
12. O outro integrante verá valores individuais ou somente informações consolidadas?

---

# 6. Modelo de Dados Financeiros

O sistema deverá trabalhar, conceitualmente, com informações como:

- Usuários;
- Famílias;
- Contas;
- Cartões;
- Instituições financeiras;
- Transações;
- Receitas;
- Despesas;
- Contas compartilhadas;
- Categorias;
- Recorrências;
- Permissões de compartilhamento;
- Conexões Open Finance.

A estrutura definitiva do banco de dados ainda deverá ser definida.

---

# 7. Movimentação Financeira

O Vidinha **não realizará transações financeiras**, conforme definido no projeto.

A plataforma não terá como objetivo:

- Transferir dinheiro;
- Realizar Pix;
- Efetuar pagamentos;
- Operar como banco;
- Manter uma conta de pagamento do usuário;
- Movimentar diretamente o dinheiro dos usuários.

O Vidinha funcionará como uma camada de **organização, visualização e inteligência sobre contas financeiras existentes**.

---

# 8. Modelo de Negócio

## 8.1 Monetização inicial

A intenção inicial é monetizar o Vidinha por meio de:

**Programas de afiliados e parcerias comerciais.**

A ideia é que, futuramente, o aplicativo possa apresentar produtos, serviços ou ofertas relacionados às necessidades dos usuários.

Quando uma compra ou contratação ocorrer através de uma recomendação do Vidinha, a plataforma poderá receber uma comissão do parceiro.

## 8.2 Modelo futuro

O conceito previsto é:

**Dados financeiros organizados → compreensão das necessidades → recomendações relevantes → eventual conversão → comissão de afiliado.**

Essa funcionalidade é considerada **futura** e não faz parte necessariamente do primeiro lançamento.

## A DEFINIR

- Quais plataformas de e-commerce serão utilizadas?
- Qual modelo de afiliado será adotado?
- As recomendações serão personalizadas?
- O usuário poderá desativar recomendações?
- Como será informado que determinada recomendação gera comissão?
- Quais dados poderão ser utilizados para gerar recomendações?
- Haverá outras fontes de receita?
- O aplicativo será gratuito?
- Existirá plano pago?

---

# 9. Stack Tecnológica

## 9.1 Aplicativo / Frontend

A aplicação será desenvolvida utilizando:

- React Native;
- Expo;
- TypeScript;
- Arquitetura mobile-first;
- Android;
- iOS.

O Expo é a tecnologia atualmente prevista para facilitar o desenvolvimento e gerenciamento do aplicativo React Native.

---

# 10. Backend

O backend será desenvolvido utilizando:

- Node.js;
- NestJS;
- TypeScript;
- Prisma ORM;
- GraphQL.

A API deverá possuir documentação completa.

## A DEFINIR

Ainda é necessário definir:

- Banco de dados;
- Hospedagem;
- Cloud provider;
- Estratégia de cache;
- Filas;
- Mensageria;
- Observabilidade;
- Logs;
- Monitoramento;
- Estratégia de escalabilidade;
- CI/CD;
- Ambientes de desenvolvimento, homologação e produção.

---

# 11. API GraphQL

A comunicação entre aplicativo e backend será realizada por meio de uma API GraphQL.

A API deverá possuir documentação completa.

Deverão ser definidos:

- Queries;
- Mutations;
- Inputs;
- Types;
- Enums;
- Interfaces;
- Paginação;
- Filtros;
- Ordenação;
- Tratamento de erros;
- Autenticação;
- Autorização;
- Rate limiting;
- Versionamento/evolução do schema.

---

# 12. Organização do Código

## 12.1 TypeScript

Utilizar TypeScript em toda a aplicação para:

- Tipagem estática;
- Redução de erros;
- Melhor documentação do código;
- Maior previsibilidade;
- Melhor experiência de desenvolvimento.

---

# 13. Arquitetura por Feature

A organização do frontend deverá preferencialmente seguir uma estrutura baseada em funcionalidades/domínios.

Exemplo conceitual:

```text
features/
  auth/
  profile/
  family/
  accounts/
  cards/
  transactions/
  expenses/
  categories/
  open-finance/
```

Em vez de concentrar todos os componentes, telas e serviços em diretórios globais por tipo.

---

# 14. Separação de Responsabilidades

A interface visual deverá permanecer separada das regras de negócio.

A arquitetura deverá buscar separar:

**UI → Estado → Regras de negócio → Comunicação com API → Persistência**

Custom Hooks poderão ser utilizados para encapsular lógica de estado e comunicação com a API.

---

# 15. Path Aliases

Deverão ser utilizados aliases de importação para evitar caminhos relativos excessivamente longos.

Exemplo conceitual:

```text
@components/Button
@features/auth
@services/api
```

A configuração definitiva deverá ser feita no TypeScript e nas ferramentas de build utilizadas pelo projeto.

---

# 16. Performance Mobile

## 16.1 Listas

Para listas longas ou dinâmicas, utilizar mecanismos apropriados do React Native, como `FlatList`, evitando renderizar desnecessariamente todos os elementos simultaneamente.

## 16.2 Imagens

As imagens deverão ser otimizadas para dispositivos móveis.

Deverão ser avaliados:

- Tamanho;
- Dimensões;
- Compressão;
- Formato;
- Cache.

## 16.3 Renderização

Deverá ser evitada a criação desnecessária de funções e objetos durante renderizações.

Quando apropriado, poderão ser utilizados mecanismos como `useCallback` e memoização.

---

# 17. Dependências

Antes da instalação de uma dependência externa, deverá ser avaliada:

- Manutenção do projeto;
- Frequência de atualizações;
- Vulnerabilidades conhecidas;
- Compatibilidade;
- Popularidade/ecossistema;
- Issues abertas;
- Dependências transitivas;
- Licença.

As dependências deverão permanecer atualizadas.

---

# 18. Segurança

A segurança deverá ser tratada como requisito arquitetural, e não como uma etapa posterior.

O material do projeto estabelece como referências:

- OWASP Top 10;
- OWASP ASVS;
- OWASP MASVS;
- LGPD;
- GDPR;
- PCI-DSS;
- ISO/IEC 27001.

**Importante:** a aplicabilidade jurídica e regulatória de cada norma ao Vidinha ainda precisa ser validada de acordo com o modelo definitivo do produto e sua operação.

---

# 19. OWASP Top 10

O desenvolvimento deverá considerar as principais categorias de vulnerabilidades de aplicações web e APIs descritas pelo OWASP.

Entre os pontos destacados no material:

- Injection;
- Falhas de autenticação;
- Exposição de dados sensíveis;
- Falhas de controle de acesso;
- Configurações inseguras;
- Dependências vulneráveis;
- Tratamento inadequado de erros.

---

# 20. OWASP ASVS

O **OWASP Application Security Verification Standard (ASVS)** deverá servir como referência para os requisitos de segurança do backend/API.

O objetivo é estabelecer requisitos verificáveis para:

- Autenticação;
- Controle de acesso;
- Validação de entrada;
- Criptografia;
- Sessões;
- APIs;
- Configuração;
- Logging;
- Proteção de dados.

---

# 21. OWASP MASVS

Para o aplicativo mobile, deverá ser considerada a utilização do **OWASP Mobile Application Security Verification Standard (MASVS)**.

Áreas relevantes:

### MASVS-STORAGE

Proteção dos dados armazenados localmente.

### MASVS-CRYPTO

Uso adequado de criptografia e gerenciamento de chaves.

### MASVS-AUTH

Autenticação e gerenciamento de sessões.

### MASVS-NETWORK

Segurança da comunicação de rede.

### MASVS-RESILIENCE

Resistência contra engenharia reversa, adulteração e ataques ao aplicativo.

---

# 22. LGPD / GDPR

O projeto deverá considerar requisitos relacionados à proteção de dados pessoais.

Especialmente porque o Vidinha trabalhará com informações financeiras e dados pessoais.

Deverão ser definidos:

- Quais dados serão coletados;
- Por que cada dado será coletado;
- Base legal aplicável;
- Consentimento quando necessário;
- Retenção;
- Exclusão;
- Portabilidade;
- Controle de acesso;
- Auditoria;
- Compartilhamento com terceiros;
- Processadores de dados;
- Política de privacidade.

**A DEFINIR:** política jurídica e bases legais específicas com profissional especializado.

---

# 23. PCI-DSS

O PCI-DSS deverá ser analisado em função do modelo definitivo do produto.

Como o projeto atualmente declara que o Vidinha **não realizará transações financeiras**, a aplicabilidade do PCI-DSS deverá ser determinada com base na arquitetura real e principalmente em como os dados de cartão serão obtidos, armazenados, processados ou transmitidos.

**A DEFINIR:** o Vidinha receberá algum dado bruto de cartão ou somente informações fornecidas pelo provedor de Open Finance?

---

# 24. Criptografia e Transporte

Toda comunicação entre aplicativo e backend deverá utilizar comunicação segura por TLS/HTTPS.

Deverão ser considerados:

- HTTPS;
- TLS;
- Certificados válidos;
- Configuração segura do servidor;
- Proteção contra ataques de interceptação.

---

# 25. HTTP Security Headers

Para componentes que utilizem comunicação HTTP/web, deverão ser avaliados headers de segurança como:

- Content-Security-Policy (CSP);
- Strict-Transport-Security (HSTS);
- X-Frame-Options;
- Outros headers recomendados pelo ambiente.

---

# 26. WAF

Deverá ser avaliada a utilização de um **Web Application Firewall (WAF)** para:

- Filtrar tráfego;
- Bloquear padrões de ataque;
- Mitigar bots maliciosos;
- Reduzir tentativas automatizadas de exploração.

**A DEFINIR:** qual infraestrutura/cloud será utilizada e, consequentemente, qual WAF será adotado.

---

# 27. Backups

A infraestrutura deverá possuir política de backup.

Os backups deverão ser:

- Periódicos;
- Protegidos;
- Preferencialmente criptografados;
- Armazenados em ambiente isolado;
- Testados através de procedimentos de restauração.

O processo de recuperação deverá ser documentado.

---

# 28. Validação de Dados

O backend nunca deverá confiar diretamente nos dados recebidos do cliente.

Toda entrada deverá ser:

- Validada;
- Sanitizada quando aplicável;
- Tipada;
- Verificada quanto às regras de negócio;
- Validada antes de chegar à camada de persistência.

Isso deverá ser aplicado a:

- Inputs GraphQL;
- Parâmetros;
- Filtros;
- Dados de usuários;
- Dados provenientes de integrações externas.

---

# 29. Princípio do Menor Privilégio

Deverá ser aplicado o **Principle of Least Privilege (PoLP)**.

Cada:

- Usuário;
- Serviço;
- API;
- Processo;
- Banco de dados;
- Conta técnica;

deverá possuir somente as permissões necessárias para executar sua função.

---

# 30. Gestão de Dependências

Dependências vulneráveis representam um risco relevante.

Deverão existir processos para:

- Atualização;
- Auditoria;
- Detecção de vulnerabilidades;
- Remoção de dependências desnecessárias;
- Controle de versões.

---

# 31. Tratamento de Erros

Erros internos não deverão expor informações sensíveis ao usuário.

Não deverão ser enviados ao cliente:

- Stack traces;
- Caminhos internos;
- Queries;
- Credenciais;
- Informações de infraestrutura;
- Detalhes internos desnecessários.

Informações detalhadas deverão permanecer nos logs protegidos.

---

# 32. Autenticação

O mecanismo definitivo de autenticação ainda precisa ser definido.

O material considera:

- OAuth 2.0;
- OpenID Connect;
- JWT;
- PKCE;
- Access Tokens;
- Refresh Tokens.

Para aplicativos nativos, **PKCE** deverá ser considerado caso OAuth 2.0 seja adotado.

---

# 33. JWT

Caso JWT seja utilizado, deverá ser definida uma estratégia para:

- Access Token;
- Expiração;
- Refresh Token;
- Rotação;
- Revogação;
- Armazenamento;
- Claims;
- Escopos;
- Invalidação de sessões.

---

# 34. Armazenamento Seguro no Mobile

Tokens e outros dados sensíveis não deverão ser armazenados em armazenamento simples do aplicativo.

O material especifica a utilização do:

**Expo SecureStore**

para armazenamento seguro de informações sensíveis, aproveitando mecanismos de segurança disponíveis no sistema operacional.

---

# 35. 2FA / MFA

A autenticação de dois fatores deverá ser considerada especialmente para contas administrativas.

O método definitivo ainda precisa ser definido.

**A DEFINIR:**

- TOTP?
- SMS?
- E-mail?
- Passkeys?
- Autenticação biométrica?
- Outro mecanismo?

---

# 36. Controle de Acesso

Deverá existir um modelo formal de autorização.

Foram identificados dois padrões:

## RBAC — Role-Based Access Control

Permissões baseadas em papéis.

Exemplo conceitual:

```text
ADMIN
MEMBER
```

## ABAC — Attribute-Based Access Control

Permissões baseadas em atributos e contexto.

Exemplo conceitual:

```text
Usuário pode acessar determinado recurso
SE
usuário pertence à família
E
recurso pertence à família
E
usuário possui permissão adequada.
```

Para o Vidinha, o modelo definitivo de autorização ainda precisa ser definido.

---

# 37. Sessões

Deverão existir mecanismos para:

- Expiração;
- Logout;
- Revogação;
- Controle de sessões;
- Proteção contra roubo de sessão;
- Gerenciamento seguro de tokens.

---

# 38. Rate Limiting

A API deverá possuir mecanismos para limitar requisições.

Objetivos:

- Mitigar força bruta;
- Reduzir abuso;
- Proteger recursos;
- Evitar consumo excessivo;
- Auxiliar na mitigação de ataques automatizados.

No ecossistema NestJS, o material considera o uso do `@nestjs/throttler`.

---

# 39. CORS

Caso existam consumidores web da API, a política de CORS deverá ser restritiva.

Não deverá ser adotado indiscriminadamente:

```text
origin: "*"
```

em produção.

A configuração definitiva dependerá dos clientes que efetivamente consumirão a API.

---

# 40. ACID

O banco de dados deverá considerar as propriedades **ACID** para operações transacionais que exigirem consistência.

## Atomicity — Atomicidade

Uma operação transacional deverá ser concluída integralmente ou não ser aplicada.

## Consistency — Consistência

A operação deverá respeitar as regras e constraints do banco de dados.

## Isolation — Isolamento

Operações concorrentes deverão possuir comportamento previsível e adequado ao nível de isolamento adotado.

## Durability — Durabilidade

Dados confirmados deverão permanecer persistidos mesmo após falhas do sistema.

---

# 41. Níveis de Isolamento

Ainda será necessário definir o nível de isolamento das transações de banco de dados.

Possíveis níveis incluem:

- Read Uncommitted;
- Read Committed;
- Repeatable Read;
- Serializable.

**A DEFINIR:** qual banco de dados será utilizado e quais operações exigirão transações e qual nível de isolamento será aplicado.

---

# 42. QoS

**QoS — Quality of Service** deverá ser considerado na arquitetura para definir requisitos de qualidade operacional.

Possíveis métricas a serem definidas:

- Latência;
- Disponibilidade;
- Throughput;
- Taxa de erro;
- Tempo de resposta;
- Capacidade;
- Recuperação após falhas.

**A DEFINIR:** quais SLAs/SLOs o Vidinha terá.

---

# 43. QoAS

O material original utiliza o termo **QoAS — Quality of Adaptive Security**.

Esse conceito foi apresentado como uma abordagem em que a segurança pode se adaptar ao contexto.

Exemplos citados no material:

- Exigir autenticação adicional;
- Aumentar restrições;
- Reforçar controles em situações consideradas de maior risco.

**A DEFINIR:** se QoAS será efetivamente adotado como requisito arquitetural do Vidinha ou se permanecerá apenas como conceito de referência.

---

# 44. ISO/IEC 27001

A **ISO/IEC 27001** deverá ser considerada como referência para gestão da segurança da informação.

Ela poderá orientar aspectos como:

- Gestão de ativos;
- Controle de acesso;
- Gestão de riscos;
- Políticas de segurança;
- Auditoria;
- Gestão de incidentes;
- Continuidade;
- Governança.

A eventual certificação da empresa/produto ainda não está definida.

---

# 45. Observabilidade

A arquitetura deverá prever mecanismos de:

- Logs;
- Monitoramento;
- Métricas;
- Alertas;
- Rastreamento de erros;
- Auditoria.

## A DEFINIR

- Ferramenta de logs;
- Ferramenta de monitoramento;
- APM;
- Error tracking;
- Retenção de logs;
- Dados que poderão aparecer nos logs;
- Política de anonimização/mascaramento.

---

# 46. Auditoria

Considerando a natureza financeira do produto, deverá ser avaliada a existência de registros de auditoria.

Exemplos:

- Login;
- Logout;
- Alteração de dados;
- Alteração de permissões;
- Conexão com instituição financeira;
- Revogação de consentimento;
- Alterações em dados compartilhados;
- Operações administrativas.

**A DEFINIR:** quais eventos precisam obrigatoriamente ser auditados e por quanto tempo serão armazenados.

---

# 47. Segurança de Segredos

Credenciais e segredos não deverão ser armazenados diretamente no código-fonte.

Isso inclui:

- Senhas;
- Tokens;
- Chaves privadas;
- Credenciais de banco;
- Secrets de APIs;
- Credenciais de infraestrutura.

A estratégia de gerenciamento de secrets ainda precisa ser definida.

---

# 48. Ambientes

Deverão ser considerados ambientes separados para:

```text
Development
Staging/Homologation
Production
```

Os dados e credenciais de produção não deverão ser utilizados indiscriminadamente em ambientes de desenvolvimento.

---

# 49. CI/CD

O projeto deverá considerar pipeline automatizado para:

```text
Código
 ↓
Lint
 ↓
Type Check
 ↓
Testes
 ↓
Security Checks
 ↓
Build
 ↓
Deploy
```

A ferramenta de CI/CD ainda precisa ser definida.

---

# 50. Testes

A estratégia de testes ainda precisa ser detalhada.

Deverão ser considerados, conforme aplicabilidade:

- Unit Tests;
- Integration Tests;
- E2E Tests;
- API Tests;
- Security Tests;
- Testes de autorização;
- Testes de concorrência;
- Testes de recuperação.

---

# 51. Segurança do Aplicativo Mobile

Além da proteção do backend, o aplicativo deverá considerar:

- Secure Storage;
- Proteção de credenciais;
- Comunicação TLS;
- Proteção contra engenharia reversa;
- Proteção contra adulteração;
- Detecção de ambientes comprometidos, se necessária;
- Gestão segura de sessão.

---

# 52. SSL Pinning

O material considera **Certificate/SSL Pinning** como uma possibilidade para ambientes de maior segurança.

A adoção ainda deverá ser decidida.

**A DEFINIR:** haverá SSL Pinning no aplicativo?

Caso sim, será necessário definir estratégia de:

- Rotação de certificados;
- Atualização do aplicativo;
- Fallback;
- Recuperação em caso de expiração;
- Gestão operacional.

---

# 53. Ofuscação e Resiliência

O material considera mecanismos de proteção contra engenharia reversa, incluindo ferramentas de build e mecanismos específicos da plataforma.

A estratégia definitiva ainda precisa ser definida para:

- Android;
- iOS;
- JavaScript bundle;
- Código nativo;
- Secrets;
- Detecção de adulteração.

---

# 54. Arquitetura Conceitual

A arquitetura inicial pode ser representada da seguinte forma:

```text
┌──────────────────────────┐
│      Usuário / Família   │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ React Native + Expo      │
│ TypeScript               │
│ Android / iOS            │
└────────────┬─────────────┘
             │
             │ GraphQL / TLS
             ▼
┌──────────────────────────┐
│ NestJS API               │
│ TypeScript               │
│ Auth                     │
│ Authorization             │
│ Business Rules            │
│ Open Finance             │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Prisma ORM               │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Banco de Dados           │
│ A DEFINIR                │
└──────────────────────────┘

             │
             │
             ▼
┌──────────────────────────┐
│ Provedor Open Finance    │
│ A DEFINIR                │
└──────────────────────────┘
```

---

# 55. Princípios Arquiteturais

O desenvolvimento deverá seguir os seguintes princípios:

1. **Security by Design**
2. **Privacy by Design**
3. **Principle of Least Privilege**
4. **Defense in Depth**
5. **Zero Trust**, caso adotado após definição da infraestrutura
6. **Separation of Concerns**
7. **Fail Secure**
8. **Secure Defaults**
9. **Input Validation**
10. **Auditability**
11. **Observability**
12. **Data Minimization**

Os princípios que efetivamente serão requisitos obrigatórios ainda deverão ser formalizados.

---

# 56. Pontos que NÃO estão definidos

Para evitar decisões inventadas, estes pontos precisam ser respondidos antes de fechar a arquitetura técnica:

## Produto

1. O Vidinha será para exatamente duas pessoas ou famílias poderão ter mais integrantes?
2. O que significa exatamente uma “conta compartilhada”?
3. Quais informações podem ser compartilhadas?
4. Quem pode visualizar cada informação?
5. Haverá divisão automática de despesas?
6. Haverá orçamento?
7. Haverá metas?
8. Haverá categorização automática?
9. Haverá notificações?
10. Haverá relatórios?

## Open Finance

11. Qual provedor será utilizado?
12. O Vidinha fará integração direta ou utilizará um intermediário?
13. Quais instituições serão suportadas?
14. Quais dados serão coletados?
15. Como será feito o consentimento?
16. Como será feita a revogação?
17. Qual será a frequência de sincronização?

## Monetização

18. O aplicativo será gratuito?
19. Haverá assinatura?
20. Haverá plano Premium?
21. Afiliados serão a única fonte de receita?
22. Quando a monetização por afiliados será implementada?

## Banco de dados

23. Qual banco será utilizado?
24. SQL ou NoSQL?
25. Qual estratégia de backup?
26. Qual região de armazenamento?
27. Qual política de retenção?

## Autenticação

28. Login por e-mail?
29. Login por telefone?
30. OAuth social?
31. Passkeys?
32. MFA?
33. Biometria?
34. JWT?
35. OAuth 2.0?
36. OIDC?
37. Como será o refresh token?

## Infraestrutura

38. Qual cloud?
39. Docker?
40. Kubernetes?
41. Serverless?
42. CDN?
43. WAF?
44. Redis?
45. Filas?
46. CI/CD?

## Segurança

47. SSL Pinning será obrigatório?
48. Qual estratégia de secrets?
49. Qual estratégia de auditoria?
50. Qual política de incident response?
51. Qual política de retenção de logs?
52. Qual política de exclusão de dados?

---

# 57. Próxima Etapa Recomendada

Antes de começar a implementar telas ou código, o ideal é transformar este documento em uma especificação técnica definitiva.

A ordem recomendada é:

```text
1. Definir regras do produto
          ↓
2. Definir modelo de compartilhamento
          ↓
3. Definir Open Finance
          ↓
4. Definir requisitos legais e de privacidade
          ↓
5. Definir modelo de dados
          ↓
6. Definir autenticação/autorização
          ↓
7. Definir arquitetura backend
          ↓
8. Definir arquitetura mobile
          ↓
9. Definir infraestrutura
          ↓
10. Definir segurança
          ↓
11. Definir testes
          ↓
12. Definir CI/CD
          ↓
13. Definir observabilidade
          ↓
14. Criar MVP
```

---

# 58. Definição Central do Vidinha

Em uma frase:

> **O Vidinha é uma plataforma de gestão financeira compartilhada para casais e famílias, que centraliza informações financeiras autorizadas por meio do Open Finance e permite organizar, compartilhar e compreender as finanças da família sem realizar movimentações financeiras.**

A visão de negócio pode ser resumida como:

> **Organizar o dinheiro que a família já possui, facilitar decisões financeiras compartilhadas e, futuramente, conectar essas necessidades a produtos e serviços relevantes por meio de parcerias e afiliados.**
