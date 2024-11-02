import pandas as pd
import json
from collections import defaultdict
import re

TCG_SET_JSON = "TCG-sets.json"
TCGtoPC = {"firered & leafgreen":"Fire Red & Leaf Green",
             "kalos starter set": "kalos starter",
             "hs—unleashed": "unleashed",
             "hs—triumphant": "triumphant",
             "hs—undaunted": "undaunted",
             "base": "base set",
            "151" : "Scarlet & Violet 151",
            "Team Magma vs Team Aqua" : "Team Magma & Team Aqua",
            "expedition base set" : "expedition",
            "pokémon go": "pokemon go",
            }
PCtoTCG = {value: key for key, value in TCGtoPC.items()}
numberRegex = r"#(\S+)"
re.compile(numberRegex)
obj = json.load(open(TCG_SET_JSON))
df = pd.read_csv("price-guide.csv", low_memory=False)

df2 = pd.read_csv("pokemon-tcg-dataset(1999-2023).csv", low_memory=False)
id_set = set(df2['id'])

setList = obj["data"]
setNameList = [s["name"].lower() for s in setList]
setMap = {s["name"].lower(): s for s in setList}

df['console-name'] = df['console-name'].apply(lambda x: ' '.join(x.split()[1:]) if x.split()[0].lower() == 'pokemon' else x)
df['console-name'] = df['console-name'].apply(lambda x: x.lower())
df = df[df['product-name'].str.contains("#")]
finalMap = defaultdict(set) #MAP Price guide ids to TCG ids or None.
count = 0
notDone = []
print(len(df2)==len(df2["id"].unique()))
matched = 0
for index, row in df.iterrows():
    matches = re.findall(numberRegex, row["product-name"])
    # if(not matches[0].isnumeric()):
    #     notDone.append(row)
    # else:
    if row["console-name"] in setMap:
        # if int(matches[0]) < setMap[row["console-name"]]["total"]:
        if setMap[row["console-name"]]["id"] + "-" +  matches[0] in id_set:
            finalMap[row["id"]] =  setMap[row["console-name"]]["id"] + "-" +  matches[0]
            id_set.remove(setMap[row["console-name"]]["id"] + "-" +  matches[0])
            count+=1
    if row["console-name"] in PCtoTCG:
        if PCtoTCG[row["console-name"]] == setMap[row["console-name"]]["name"]:
            if (setMap[row["console-name"]] + "-" + matches[0]) in id_set:
                


id_set_df = pd.DataFrame(list(id_set), columns=['id'])
id_set_df.to_csv('id_set.csv', index=False)
print(id_set)
print(len(df))
print(count)

