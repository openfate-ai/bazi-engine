"""Inline the public deterministic reading rules into one browser-openable, offline HTML file."""
import json
import re
from pathlib import Path

HERE=Path(__file__).resolve().parent
RUNTIME=('language','chapters','decisions','cases-work','cases-people','cases-life','cases-choices',
         'case-signals','chart-logic','book','yearbook')
IMPORT=re.compile(r"^import \{([^}]+)\} from '\./([a-z-]+)\.mjs';",re.M)
EXPORT=re.compile(r'\bexport (?:const|function\*?) (\w+)')

def bundle():
    parts=['const corpusRules = Object.create(null);']
    for name in RUNTIME:
        code=(HERE/(name+'.mjs')).read_text()
        exports=EXPORT.findall(code)
        code=IMPORT.sub(lambda m:'const {'+m[1]+'} = corpusRules['+json.dumps(m[2])+'];',code)
        if not exports or re.search(r'^import ',code,re.M):raise ValueError('Unsupported reader module '+name)
        parts.append('corpusRules['+json.dumps(name)+'] = (() => {\n'+code.replace('export ','')+
                     '\nreturn {'+','.join(exports)+'};\n})();')
    return '\n'.join(parts).replace('</script','<\\/script')
