import json
pay=open('../data/payload.json').read()
js = ("const PAY=%s;\n" % pay) + \
     open('part2.js').read() + "\n" + open('part3.js').read()
open('../app/app.js','w').write(js)
html = open('part1.html').read() + js + "\n</script>\n</body>\n</html>\n"
open('../app/prop_model_2026.html','w').write(html)
import os
print('app.js', os.path.getsize('../app/app.js'))
print('html', os.path.getsize('../app/prop_model_2026.html'))
