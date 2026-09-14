import json
pay=open('../data/payload.json').read()
VALID=[["QB passing yards","65.8","69.9","79.9"],["QB pass attempts","8.12","8.56","9.75"],
["QB completions","5.54","5.90","6.56"],["QB passing TDs","0.91","0.95","0.99"],
["QB interceptions","0.65","0.66","0.67"],["QB carries","1.77","1.80","2.16"],
["QB rushing yards","11.63","11.45","14.40"],["RB carries","3.46","3.49","5.76"],
["RB rushing yards","20.92","21.39","28.93"],["RB receptions","1.13","1.15","1.40"],
["RB receiving yards","11.01","11.08","12.92"],["RB rush + rec yards","25.20","25.53","35.56"],
["WR targets","1.99","2.02","2.74"],["WR receptions","1.48","1.51","1.92"],
["WR receiving yards","22.75","23.39","28.06"],["TE targets","1.55","1.57","2.09"],
["TE receptions","1.29","1.34","1.64"],["TE receiving yards","16.01","16.68","19.32"],
["Kicker field goals made","1.00","1.08","1.01"],["Kicker kicking points","3.67","4.02","3.71"]]
CALIB=[["about 12%","11.0%",-1.0],["about 25%","23.2%",-1.9],["about 34%","31.8%",-2.6],
["about 43%","42.2%",-0.9],["about 47%","45.7%",-1.5],["about 52%","50.6%",-1.6],
["about 57%","56.5%",-1.0],["about 65%","63.3%",-1.4],["about 75%","75.2%",0.0],["about 89%","88.8%",0.1]]
WALK=[["QB passing yards","5.3","6.8","4.1","5.5","6.2","5.6"],
["QB pass attempts","5.5","2.5","4.1","5.6","5.3","4.6"],
["QB passing TDs","0.8","2.5","0.2","-0.4","5.0","1.6"],
["RB rushing yards","1.0","1.8","0.5","1.8","2.4","1.5"],
["RB carries","0.8","-0.3","0.4","0.7","1.0","0.5"],
["WR receiving yards","0.7","1.9","1.3","1.5","2.6","1.6"],
["WR receptions","0.8","2.0","1.2","-0.1","1.8","1.1"],
["TE receiving yards","2.5","3.6","1.8","2.4","4.5","3.0"]]
SEASONCAL=[["2021","24.3%","47.6%","75.2%"],["2022","23.0%","47.0%","75.1%"],
["2023","23.0%","47.9%","75.8%"],["2024","24.6%","48.6%","76.4%"],["2025","23.5%","47.0%","75.6%"]]
js = ("const PAY=%s;\n" % pay) + \
     ("const WALK=%s;\n" % json.dumps(WALK)) + \
     ("const SEASONCAL=%s;\n" % json.dumps(SEASONCAL)) + \
     ("const VALIDATION=%s;\n" % json.dumps(VALID)) + \
     ("const CALIB=%s;\n" % json.dumps(CALIB)) + \
     open('part2.js').read() + "\n" + open('part3.js').read()
open('../app/app.js','w').write(js)
html = open('part1.html').read() + js + "\n</script>\n</body>\n</html>\n"
open('../app/prop_model_2026.html','w').write(html)
import os
print('app.js', os.path.getsize('../app/app.js'))
print('html', os.path.getsize('../app/prop_model_2026.html'))
