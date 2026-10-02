Ativação da validação por IP
===========================

Execute `migrations/202610010001_member_ip_validation.sql` no SQL Editor do projeto Supabase configurado em `js/supabase-config.js`, antes de publicar estes arquivos.

O trigger captura o IP nos cabeçalhos da requisição recebida pelo Supabase. Os IPs são armazenados em um schema privado; a tabela pública recebe apenas `ip_duplicate`. O cadastro continua permitido para diferentes nicks, mas todos os membros do mesmo IP recebem o indicador, incluindo o primeiro. A restrição existente de um cadastro por nick permanece.

Validação após aplicar:

1. Cadastre dois nicks diferentes na mesma conexão. Atualize a lista: os dois cards devem ficar vermelhos, inclusive ao pesquisar só um deles.
2. Cadastre outro nick em uma conexão diferente: seu card deve permanecer normal.
3. Exclua um dos dois membros do primeiro IP e atualize a lista: o restante deve voltar ao normal.
4. Verifique também dois cadastros simultâneos e um membro com card dourado: a sinalização vermelha deve prevalecer.

Cadastros antigos não possuem IP e não são classificados retroativamente. Pessoas na mesma rede compartilham IP público; o aviso indica IP compartilhado, não comprova que sejam a mesma pessoa. Trocar a conexão ou usar VPN pode alterar o IP.

Confirme no ambiente publicado que o proxy encaminha o IP real em `cf-connecting-ip`, `x-real-ip` ou `x-forwarded-for` e que substitui cabeçalhos enviados pelo cliente. O primeiro endereço de `x-forwarded-for` só é confiável sob essa configuração. Cadastros públicos sem esses cabeçalhos retornam erro em vez de serem classificados com um IP incorreto. Importações administrativas sem cabeçalhos ficam sem classificação.

Referência sobre acesso aos cabeçalhos da requisição no banco: https://postgrest.org/en/latest/references/transactions.html
