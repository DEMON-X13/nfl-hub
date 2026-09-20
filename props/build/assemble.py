import json
# The payload is no longer baked in: the app fetches ../data/payload.json when it boots,
# so the page and the data are separate files and a page held in a browser cache never
# carries last week's numbers with it. publish.js rewrites this path for the two pages it
# publishes, which sit one directory up from the app.
pay=open('../data/payload.json').read()
json.loads(pay)          # the app will fetch it, so a broken payload must fail here, not there
js = "let PAY=null;\nconst DATA_URL='../data/payload.json';\n" + \
     open('part2.js').read() + "\n" + open('part3.js').read()
open('../app/app.js','w').write(js)
html = open('part1.html').read() + js + "\n</script>\n</body>\n</html>\n"
open('../app/prop_model_2026.html','w').write(html)
import os
print('app.js', os.path.getsize('../app/app.js'))
print('html', os.path.getsize('../app/prop_model_2026.html'))
