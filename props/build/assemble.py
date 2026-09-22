import json, os
# The payload is no longer baked in: the app fetches ../data/payload.json when it boots,
# so the page and the data are separate files and a page held in a browser cache never
# carries last week's numbers with it. The assembled page is the audit's subject and is
# not published: the prop model has no site of its own, and nflbets/build/build.js
# assembles the same parts into the X NFL Bets and Stats page. ../app/ is gitignored
# whole, so it may not exist on a fresh checkout.
os.makedirs('../app', exist_ok=True)
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
