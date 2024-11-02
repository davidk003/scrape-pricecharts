import csv
import pandas as pd
from collections import defaultdict
import json
from unidecode import unidecode


TCG_SET_JSON= "TCG-sets.json"
SET_BLACKLIST= ["nintendo black star promos", "wizards black star promos"] #No consistent naming schemes

obj = json.load(open(TCG_SET_JSON))

print(list(obj.keys()))
print(f"count is same as total count: {obj["count"]==obj["totalCount"]}")
setList = obj["data"]
setNameList = [s["name"] for s in setList]
print(f"Number of sets: {len(setList)}")
print("------- associated keys for first set --------")
for attr in list(setList[0].keys()):
    print(attr)
print("----------------------------------------------")
print("The number printed on the card that represents the total. This total does not include secret rares.")
print(f"total printed: {sum([x["printedTotal"] for x in setList])}")
print("The total number of cards in the set, including secret rares, alternate art, etc.")
print(f"total printed: {sum([x["total"] for x in setList])}")
print(f"Number of set names with \"pokemon\" in name: {sum([("pokemon" in name.lower()) for name in setNameList])}")
print(f"Number of set names with numerics in them: {sum((name.isnumeric()) for name in setNameList)}")
print(f"Number of sets with less than 10 cards: {sum((s["total"] < 10) for s in setList)}")
print(f"Number of sets with less than 25 cards: {sum((s["total"] < 25) for s in setList)}")
print(f"Number of sets with less than 50 cards: {sum((s["total"] < 50) for s in setList)}")
print(f"Number of sets with less than 100 cards: {sum((s["total"] < 100) for s in setList)}")
print("----------- price guide analysis --------------")
df = pd.read_csv("price-guide.csv")
print(f"All ids are unique:{len(df["id"]) == len(df["id"].unique())}") #Ids are unique
print(f"Num of cards: {len(df["id"])}")
print(f"Number of unique sets: {len(df["console-name"].unique())}")
print(f"Number of set names with \"pokemon\" in name: {sum([("pokemon" in name.lower()) for name in df["console-name"].unique()])}")
print("-----------------------------------------------")
print(f"Minimum cards for all sets in TCG: {min([t for t in [s["total"] for s in setList]])}")
minSetSize = min([t for t in [s["total"] for s in setList]])

# The weird sets

# for s in setList:
#     if s["total"] < 25:
#         print(f"{s["name"]} : {s["total"]}")

# prune all in priceguide < minSetSize

# Since all sets in the price-guide seem to keep to this Pokemon {Set name} format, this makes life easier
# Especially since the TCG list does not prefix with "Pokemon"
# WATCH OUT FOR Scarlet & Violet SET NAMES

#FILTER BY SIZE and CLEAN NAMES
tempDict = dict(df["console-name"].value_counts())
filteredDict = {}
for name, count in zip(tempDict.keys(), tempDict.values()):
    if count >= minSetSize:
        separated = name.lower().replace("-", " ").split(" ")
        invalids = set(["pokemon","", " "])
        if separated[0] in invalids:
            separated = separated[1:] #Remove first
        if separated[len(separated)-1] in invalids:
            separated = separated[0:len(separated)-1] #Remove last
        filteredDict[(" ".join(separated))] = count
print(f"{len(tempDict) - len(filteredDict)}({len(tempDict)} -> {len(filteredDict)}) filtered, {len(filteredDict)} left.")

matching = 0
unmatched = {}
for s in setList:
    if s["name"].lower() not in SET_BLACKLIST:
        if unidecode(s["name"].lower()) in filteredDict:
            matching+=1
        else:
            unmatched[s["name"].lower()] = s["total"]
print(f"Based on cleaning/filtering, {matching} matched. {len(setNameList)-matching} remaining.\n")

#need to check product-name in priceguide for promo code names to see if they exist.
promoCodes = defaultdict(set)
for k in unmatched.keys():
    if "promo" in k:
        promoCodes["#"+ k.split(" ")[0]] = 0
        # print(f"{k} : {unmatched[k]}")
del promoCodes["#scarlet"]
promoCodes["#svp"] = 0
#scarlet & violet star promos maps to SVP



promoDf = df.loc[df["console-name"]=="Pokemon Promo"]
totalPromo = len(promoDf)
print(f"Total promo cards in price guide: {totalPromo}")
for name in promoDf["product-name"]:
    for code in promoCodes:
        if code in name.lower():
            promoCodes[code]+=1
            break
print(f"Recoverable promo code cards: {sum(promoCodes.values())}")

setsLeft = len(setNameList) - matching - sum([(promoCodes[k]>0) for k in promoCodes.keys()])
print(f"sets left after promo filter: {setsLeft}")
print("-------------------------------------")

potentialCards = 0
num = 0
for k in unmatched.keys():
    if "promo" not in k and unmatched[k] > 50:
        print(f"{k} : {unmatched[k]}")
        potentialCards+=unmatched[k]
        num +=1
print(f"Potential cards left: {potentialCards}")
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
# For hidden fates and shining fates check #SV in name.
print(num)
