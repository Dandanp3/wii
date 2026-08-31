# 🎮 Wii Motion

> **Projeto experimental desenvolvido para fins de estudo e experimentação com IA.**

Este repositório faz parte de um experimento pessoal para testar até onde uma **IA generativa consegue projetar e desenvolver um sistema relativamente complexo**, seguindo uma arquitetura real e evoluindo o projeto de forma incremental.

A ideia é criar uma plataforma inspirada no funcionamento do **Nintendo Wii**, onde o computador executa o sistema e um **celular funciona como um controle de movimento**, permitindo utilizar os sensores do próprio aparelho para reproduzir movimentos semelhantes aos de um Wii Remote.

---

## 🧪 Sobre o experimento

Este não é o projeto principal de desenvolvimento.

O objetivo deste repositório é servir como um **laboratório de experimentação com IA**, utilizando o [Google Gemini](https://gemini.google.com/) como principal agente de desenvolvimento.

A IA recebe uma especificação geral do projeto e é responsável por:

* definir a arquitetura;
* escolher tecnologias;
* criar a estrutura do projeto;
* desenvolver cada módulo;
* escrever os códigos;
* criar testes;
* analisar problemas;
* evoluir o sistema gradualmente.

O desenvolvimento é realizado em **fases independentes**, onde uma etapa precisa ser implementada e validada antes que a próxima seja iniciada.

A intenção é observar se a IA consegue manter a consistência da arquitetura à medida que o sistema cresce, em vez de simplesmente gerar um projeto inteiro de uma vez.

---

# 🎮 O projeto

A ideia é criar uma experiência semelhante à seguinte:

```text
             📱 CELULAR
          ┌──────────────┐
          │              │
          │  Wii Remote  │
          │   Virtual    │
          │              │
          │  A   B       │
          │  ↑           │
          │ ←   →        │
          │  ↓           │
          │              │
          │  🌀 Motion   │
          └──────┬───────┘
                 │
              Wi-Fi
                 │
                 ▼
        ┌──────────────────┐
        │        PC        │
        │                  │
        │    Wii Core      │
        │                  │
        │ Controller State │
        │       +          │
        │   Motion State   │
        │                  │
        └────────┬─────────┘
                 │
                 ▼
              🎮 Jogo
```

O celular deverá ser capaz de transmitir:

* botões;
* acelerômetro;
* giroscópio;
* orientação;
* movimentos;
* futuramente, gestos e outras informações.

O computador recebe essas informações e transforma os dados em um **estado abstrato de controle**, que poderá ser utilizado pelos jogos da plataforma.

---

# 🏗️ Arquitetura

A arquitetura está sendo construída gradualmente.

Atualmente, a comunicação básica utiliza **WebSocket**, permitindo que o PC e o dispositivo controlador troquem informações através da rede local.

A arquitetura planejada possui aproximadamente esta estrutura:

```text
┌───────────────────────┐
│     Mobile Client     │
│                       │
│ Buttons + Sensors     │
└───────────┬───────────┘
            │
         WebSocket
            │
            ▼
┌───────────────────────┐
│       Wii Core        │
│                       │
│ Connection Manager    │
│ Controller Manager    │
│ Controller State      │
│ Motion State          │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│        Games          │
│                       │
│   Controller API      │
└───────────────────────┘
```

A arquitetura ainda está em desenvolvimento e pode mudar conforme novos problemas técnicos forem encontrados.

---

# 🚧 Desenvolvimento por fases

O projeto está sendo desenvolvido de maneira incremental.

### Fase 1 — Arquitetura

Definição inicial da arquitetura, tecnologias e organização do projeto.

### Fase 2 — Comunicação

Implementação da comunicação entre cliente e PC utilizando WebSocket.

**Status:** ✅ Concluída

### Fase 3 — Controle

Implementação do estado do controle e transmissão de botões.

**Status:** ✅ Concluída

### Fase 4 — Movimento

Captura e transmissão dos sensores do celular:

* acelerômetro;
* giroscópio;
* orientação;
* timestamp.

**Status:** 🚧 Em desenvolvimento

### Próximas fases

Ainda estão em planejamento, mas poderão incluir:

* processamento de movimento;
* detecção de shake;
* calibração;
* sensor fusion;
* ponteiro;
* API para jogos;
* launcher;
* biblioteca de jogos;
* criação de jogos próprios;
* integração entre controle e jogos.

> O roadmap pode mudar conforme o desenvolvimento e os resultados do experimento.

---

# 🤖 Desenvolvimento com IA

Uma das principais regras deste experimento é **não pedir para a IA desenvolver tudo de uma vez**.

Em vez disso, o desenvolvimento segue um ciclo:

```text
Especificação
      ↓
Arquitetura
      ↓
Implementação
      ↓
Teste
      ↓
Validação
      ↓
Próxima fase
```

A IA recebe apenas a próxima etapa do projeto e precisa considerar o que já foi desenvolvido anteriormente.

Isso permite avaliar questões como:

* consistência arquitetural;
* capacidade de manutenção;
* organização do código;
* criação de abstrações;
* tratamento de erros;
* testes;
* evolução de funcionalidades;
* capacidade de resolver problemas inesperados;
* capacidade de trabalhar com um projeto existente sem reescrevê-lo completamente.

---

# 🧰 Tecnologias

As tecnologias **não são fixas**.

Uma das partes do experimento é permitir que a própria IA escolha as ferramentas mais adequadas para cada problema.

Dependendo da evolução do projeto, podem ser utilizados:

* TypeScript;
* Node.js;
* WebSocket;
* HTML/CSS/JavaScript;
* APIs de sensores dos dispositivos móveis;
* HTTPS;
* outras tecnologias que se mostrarem necessárias.

A escolha das tecnologias pode mudar durante o desenvolvimento.

---

# 🎯 Objetivo

O objetivo final não é necessariamente criar um substituto perfeito para o Nintendo Wii.

O objetivo principal é descobrir:

> **Até onde uma IA consegue desenvolver, manter e evoluir um sistema relativamente complexo quando recebe uma especificação de alto nível e precisa construir tudo de forma incremental?**

O projeto serve como uma espécie de **benchmark prático de desenvolvimento assistido por IA**.

---

# 📚 Status

**Projeto experimental — em desenvolvimento.**

A implementação está sendo realizada gradualmente e novas funcionalidades serão adicionadas conforme o experimento avançar.
