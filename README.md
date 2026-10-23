# Painel de servidores por unidade e hierarquia

Painel estático com a quantidade de servidores do Poder Executivo de Goiás por unidade, na hierarquia do Decreto 10.218 (Anexo I, sem as linhas extintas).

- Folha de setembro de 2026, sem nomes de servidores e sem valores de remuneração.
- Visão por órgão, busca, alternância entre pessoas e vínculos, exportação em CSV e exportação de cada órgão em HTML e um chat em linguagem natural (interpretado no navegador, sem API externa).
- Site: `index.html` (publicado com GitHub Pages).

## Como regenerar

Os scripts em `build/` leem a planilha de remuneração e o PDF do decreto, que não ficam no repositório (a planilha tem dados pessoais):

1. `python build/parse_decreto.py` extrai a estrutura do decreto.
2. `python build/build_tree.py` cruza a estrutura com a planilha e gera `H.json`.
3. `python build/patch_painel.py` monta o `index.html` a partir do painel base.

Os caminhos dos arquivos de entrada estão no início de cada script.
