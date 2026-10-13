# Catálogo de Cimentos e Ferragens — Guia de configuração e publicação

## Páginas
- `/` Início · `/catalogo` Catálogo (filtro por categoria e busca) · `/orcamento` Simulador de orçamento
- `/auth` Acesso administrativo · `/admin` Painel (produtos, categorias, configurações, orçamentos)

## Primeiro acesso ao painel
1. Abra `/auth` → "Primeiro acesso? Criar conta" e cadastre o e-mail do administrador.
2. Confirme o e-mail pelo link recebido.
3. **A primeira conta criada vira administradora.** Contas criadas depois não acessam o painel.
4. Em "Configurações da loja", preencha nome, logotipo, WhatsApp (somente dígitos: 55 + DDD + número) e endereço.
5. Em "Produtos", edite ou desative os produtos de demonstração (marcados como "Demonstração · preço fictício") e cadastre os reais.

## Como funciona o orçamento
- Os preços são buscados no banco no momento de finalizar; o navegador nunca define o preço.
- Cada orçamento recebe um número único (ex.: `ORC-261013-F2B119`) e uma cópia dos preços aplicados.
- O orçamento é salvo **antes** de abrir o WhatsApp. O site não afirma que a mensagem foi enviada.
- Frete não é adicionado automaticamente.

## Segurança
- Visitantes só leem produtos/categorias ativos e configurações públicas da loja.
- Orçamentos e dados de clientes são legíveis apenas por administradores.
- Alterações de produtos, preços, categorias, configurações e fotos exigem conta administradora.
- Nenhuma senha ou chave secreta está no código.

## Publicação em domínio próprio
1. Clique em **Publish** no editor.
2. Em Project → Settings → Domains, conecte o domínio e configure os registros DNS indicados.

## Serviços e custos
- **Lovable (hospedagem + Lovable Cloud: banco de dados, login, armazenamento de fotos)** — incluído no plano; uso acima da cota gratuita pode gerar custo.
- **Domínio próprio** — pago anualmente ao registrador escolhido.
- **WhatsApp** — usa link `wa.me`, sem custo e sem API paga.
- **PDF** — gerado no próprio navegador, sem custo.
