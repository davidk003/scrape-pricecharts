import pandas as pd
import json
from collections import defaultdict
import re

TCG_SET_JSON = "TCG-sets.json"
PG_FILE = "price-guide.csv"
TCG_FILE = "pokemon-tcg-dataset(1999-2023).csv"
TCGtoPC = {"firered & leafgreen":"Fire Red & Leaf Green",
             "kalos starter set": "kalos starter",
             "HS—Unleashed": "unleashed",
             "HS—Triumphant": "triumphant",
             "hs—undaunted": "undaunted",
             "base": "base set",
            "151" : "Scarlet & Violet 151",
            "Team Magma vs Team Aqua" : "Team Magma & Team Aqua",
            "expedition base set" : "expedition",
            "pokémon go": "pokemon go",
            "Pokémon GO" : "go",
            }

for i in range(11,25):
    TCGtoPC[f"McDonald's Collection 20{i}"] = f"mcdonalds 20{i}"
PCtoTCG = {value.lower(): key.lower() for key, value in TCGtoPC.items()}
numberRegex = r"#(\S+)"
re.compile(numberRegex)
obj = json.load(open(TCG_SET_JSON, encoding='utf-8'))
df = pd.read_csv(PG_FILE, low_memory=False)

df2 = pd.read_csv(TCG_FILE, low_memory=False)
id_set = set(df2['id'])

setList = obj["data"]
setNameList = [s["name"].lower() for s in setList]
setMap = {s["name"].lower(): s for s in setList}
setidMap = {s["id"].lower(): s for s in setList}

df['console-name'] = df['console-name'].apply(lambda x: ' '.join(x.split()[1:]).lower() if x.split()[0].lower() == 'pokemon' else x.lower())
df = df[~df['console-name'].str.contains('japanese|topps', case=False, na=False)]
df = df[df['product-name'].str.contains("#")]

unseenSets = dict(df['console-name'].value_counts())

finalMap = defaultdict(set) #Map of Price guide ids to TCG ids or None.
totalConverted = 0
rawConverted = 0
promoConverted = 0
manualConverted = 0
notDone = []
print(len(df2)==len(df2["id"].unique()))
matched = 0
for index, row in df.iterrows():
    PCSetName = row["console-name"]
    matches = re.findall(numberRegex, row["product-name"])
    onlyAlpha = ''.join([char for char in matches[0].lower() if char.isalpha()])
    onlyNumeric = ''.join([char for char in matches[0] if char.isnumeric()])
    if PCSetName == "hidden fates" or PCSetName == "shining fates": # shiny vaults
        if onlyAlpha == "sv":
            PCSetName += " shiny vault"
    elif onlyAlpha == "gg": #  Crown Zenith Galarian Gallery -> swsh12pt5gg
        if "swsh12pt5gg" + "-" + matches[0] in id_set:
            finalMap[row["id"]] = "swsh12pt5gg" + "-" + matches[0]
            manualConverted+=1
    elif onlyAlpha == "tg": #Other trainer galleries
        if PCSetName in setMap:
            if setMap[PCSetName]["id"]+ "tg" + "-" + matches[0] in id_set:
                finalMap[row["id"]] = setMap[PCSetName]["id"] + "-" + matches[0]
                manualConverted+=1

    if PCSetName in setMap: #Raw cleaned name check
        if PCSetName in unseenSets:
            unseenSets[PCSetName]-=1
        if setMap[PCSetName]["id"] + "-" +  matches[0] in id_set:
            finalMap[row["id"]] =  setMap[PCSetName]["id"] + "-" +  matches[0]
            rawConverted+=1
    if PCSetName in PCtoTCG and PCtoTCG[PCSetName] in setMap: #Manual name check
        if (setMap[PCtoTCG[PCSetName]]["id"] + "-" + matches[0]) in id_set:
            finalMap[row["id"]] = (setMap[PCtoTCG[PCSetName]]["id"] + "-" + matches[0])
            manualConverted+=1
# 1527 promo cards
# If console-name is promo, check name's # regex -> The letters caught in the numbers regex -> search TCG series -> convert to id and keep # regex as number for id.
    if PCSetName == "promo": #Promo case
        onlyAlpha+="p"
        if  onlyAlpha in setidMap:
            if int(onlyNumeric) <= setidMap[onlyAlpha]["printedTotal"]:
                if (setidMap[onlyAlpha]["id"] + "-" + matches[0].upper()) in id_set:
                    finalMap[row["id"]] = setidMap[onlyAlpha]["id"] + "-" + matches[0]
                    promoConverted+=1
                else:
                    print(matches[0])

unseenTotal = 0

print(f"Total rows: {len(df)}")
print(f"Total converted: {promoConverted+manualConverted+rawConverted}")
print(f"Total unseen sets: {unseenTotal}")
print(f"Total promo converted: {promoConverted}")
print(f"Total manual converted: {manualConverted}")
print(f"Total raw converted: {rawConverted}")

for k in finalMap.keys():
    if finalMap[k] in id_set:
        id_set.remove(finalMap[k])
id_set_df = pd.DataFrame(list(id_set), columns=['id'])
id_set_df['id'] = id_set_df['id'].apply(lambda x: x.split("-")[0])
id_set_df.to_csv('id_set.csv', index=False)
# print(id_set_df['id'].value_counts())

dfFinal = pd.DataFrame(finalMap.items(), columns=["id", "tcg_id"])
dfFinal.to_csv('final_map.csv', index=False)
print(len(dfFinal["id"].unique())==len(dfFinal["id"]))
print(PCtoTCG)