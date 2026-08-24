# Esta pasta NÃO é publicada. Não edite nada aqui.

A página que o público vê em <https://nandovalle.github.io/insane-baroque-blaze/>
vem de **outro repositório**:

    https://github.com/NandoValle/insane-baroque-blaze   (branch main)
    clone local: C:\Users\MICRO\Downloads\insane-baroque-blaze

O GitHub Pages publica repositório de projeto em `usuario.github.io/<nome-do-repo>/`,
e esse endereço **tem precedência** sobre a pasta de mesmo nome dentro do repositório
do site. Tudo sob `/insane-baroque-blaze/` é servido de lá, inclusive este arquivo.

## Por que este aviso existe

Havia aqui uma cópia do `index.html` que ninguém nunca viu. Ela foi editada por engano
mais de uma vez — em 24/08/2026 um link para `/o-tritono/` ficou preso nesta pasta e
não chegou ao ar. A cópia foi apagada nessa data; o histórico do Git ainda a tem.

## Como saber se uma pasta está sombreada

    curl -s -o /dev/null -w "%{http_code}" https://github.com/NandoValle/<nome-da-pasta>

`200` = existe repositório de mesmo nome, a pasta está sombreada. `404` = a pasta é servida
normalmente daqui. Em 24/08/2026 só `insane-baroque-blaze/` estava nessa situação;
`en/`, `img/` e `o-tritono/` estavam limpas.

Outro sintoma: depois de um push, `curl -sI <url> | grep -i last-modified` não muda a data.
Query string não fura o cache do Pages (a chave ignora `?`) e o TTL de borda é `max-age=600`.
