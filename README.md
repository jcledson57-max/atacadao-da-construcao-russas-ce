# Atacadão da Construção Russas-ce 

Crie um site profissional, moderno e responsivo para uma loja de materiais de construção, com foco em CIMENTOS E FERRAGENS.



O site será usado para divulgação dos produtos, captação de clientes e geração de orçamentos online. Não será necessário pagamento online nesta primeira versão.



IDIOMA E MOEDA



- Todo o site deve estar em português brasileiro.

- Utilizar Real brasileiro (R$).

- Adaptar perfeitamente para celulares, tablets e computadores.

- Criar uma identidade visual profissional relacionada à construção civil.



IDENTIDADE VISUAL



- Aparência moderna, organizada e confiável.

- Usar cores que transmitam força e profissionalismo, como azul-escuro, cinza, branco e detalhes em laranja.

- Criar um espaço para o logotipo e o nome da loja, que serão configurados posteriormente.

- Não inventar nome, endereço, telefone ou informações reais da empresa.



PÁGINA INICIAL



- Apresentar o nome e a identidade visual da loja.

- Exibir um destaque para cimento e ferragens.

- Ter botão "Ver catálogo".

- Ter botão "Montar meu orçamento".

- Ter botão de contato pelo WhatsApp.

- Mostrar os produtos em cartões com fotos, nome, unidade de venda e preço.

- Criar navegação simples e intuitiva.



CATÁLOGO DE PRODUTOS

Criar duas categorias principais:



1. Cimentos.

2. Ferragens.



Permitir cadastrar posteriormente produtos como cimento de diferentes marcas, vergalhões, arames, pregos, treliças e outros materiais.



Cada produto deverá possuir:



- Nome.

- Categoria.

- Foto.

- Descrição.

- Unidade de venda, como saco, unidade, barra ou quilo.

- Preço fixo em reais.

- Status ativo ou inativo.



Não inventar preços reais. Os produtos de demonstração devem estar claramente identificados e não poderão ser confundidos com preços comerciais verdadeiros.



SIMULADOR DE ORÇAMENTO



- Permitir que o cliente adicione produtos ao orçamento.

- Permitir alterar quantidades e remover produtos.

- Calcular automaticamente o subtotal de cada item e o total geral.

- Exibir a quantidade, a unidade, o preço unitário e o subtotal.

- Atualizar o total instantaneamente sempre que a quantidade for alterada.

- Permitir continuar comprando e voltar ao catálogo.

- Exibir um resumo final claro e organizado.

- Solicitar nome e telefone do cliente antes de finalizar.

- Permitir informar endereço de entrega, se necessário.

- Não adicionar frete automaticamente sem uma regra configurada pela loja.



GERAÇÃO DE PDF

Implementar a geração REAL de um arquivo PDF, que funcione em celulares e computadores.



O PDF deverá conter:



- Nome e logotipo da loja, quando cadastrados.

- Número único do orçamento.

- Data e hora de criação.

- Nome e telefone informados pelo cliente.

- Lista de produtos.

- Quantidades e unidades.

- Preços unitários e subtotais.

- Valor total.

- Endereço de entrega, quando informado.

- Observação de que o orçamento está sujeito à confirmação de disponibilidade e condições de entrega pela loja.



Disponibilizar um botão "Baixar orçamento em PDF".



WHATSAPP DA LOJA



- Criar um botão "Enviar orçamento pelo WhatsApp".

- Permitir configurar o número oficial da loja em um painel administrativo.

- Abrir o WhatsApp com uma mensagem preenchida contendo o nome do cliente, número do orçamento, produtos, quantidades e valor total.

- Identificar claramente a origem como "CATÁLOGO ONLINE".

- Incluir o número de referência do orçamento na mensagem.

- Não afirmar que a mensagem foi enviada até que o envio seja confirmado.

- Orientar o cliente a confirmar o envio no aplicativo do WhatsApp.



REGISTRO DOS ORÇAMENTOS



- Salvar cada orçamento no banco de dados antes de abrir o WhatsApp.

- Gerar um identificador único para cada orçamento.

- Registrar data, hora, nome do cliente, telefone, produtos, quantidades, preços e total.

- Registrar a origem como "SITE/CATÁLOGO ONLINE".

- Permitir consultar os orçamentos posteriormente no painel administrativo.

- Salvar uma cópia dos preços aplicados no momento da simulação, para que alterações futuras no catálogo não modifiquem orçamentos antigos.



PAINEL ADMINISTRATIVO

Criar uma área administrativa protegida por autenticação real.



O administrador deverá conseguir:



- Cadastrar, editar e desativar produtos.

- Alterar preços fixos.

- Cadastrar fotos e descrições.

- Organizar categorias.

- Configurar nome, logotipo, telefone do WhatsApp e endereço da loja.

- Consultar os orçamentos recebidos pelo site.

- Visualizar detalhes de cada orçamento.

- Identificar os clientes que chegaram pelo catálogo online.



SEGURANÇA E BANCO DE DADOS



- Utilizar banco de dados persistente.

- Se utilizar Supabase, configurar autenticação, tabelas, políticas de acesso e proteção dos dados.

- Não permitir que visitantes alterem preços ou acessem o painel administrativo.

- Não colocar senhas ou chaves secretas no código público.

- Validar os dados antes de salvar.

- Restringir o acesso aos dados pessoais dos clientes.

- Não criar login administrativo com senha fixa exposta no código.



PUBLICAÇÃO



- Preparar o projeto para publicação em domínio próprio.

- Manter o código organizado e documentar como publicar e configurar o projeto.

- Explicar quais serviços externos são necessários e quais podem gerar custos.

- Não considerar o site pronto apenas porque a tela inicial está funcionando.



TESTES OBRIGATÓRIOS



1. Cadastrar e atualizar um produto.

2. Alterar um preço no painel e verificar a atualização do catálogo.

3. Adicionar vários produtos ao orçamento.

4. Conferir os cálculos de quantidades, subtotais e total.

5. Gerar e baixar um PDF verdadeiro.

6. Salvar um orçamento no banco de dados.

7. Abrir o WhatsApp com a mensagem correta.

8. Verificar se os dados administrativos e os orçamentos estão protegidos.

9. Testar em celular e computador.



Construa o projeto funcional por etapas. Primeiro implemente a interface e o catálogo; depois o banco de dados, o painel administrativo, o PDF e a integração com WhatsApp. Informe claramente o que estiver implementado, o que estiver pendente e como testar cada funcionalidade.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://atacadao-da-construcao-russas-ce.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ee4f5487-7ade-4bb0-960b-b6a5494c26b5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
