import csv
import pandas as pd
import requests

url = "http://localhost:5173/getHistoric?id="

df = pd.read_csv("price-guide.csv")
print(len(df["id"]) == len(df["id"].unique())) #Ids are unique
print(len(df["id"]))
output = "ids-gethistoric.txt"
idArr = []
for id in df["id"]:
    idArr.append(str(id))


# Convert price-guide to ids in output.csv
with open("output.csv", "w") as out:
    out.write("id,\n")
    for id in idArr:
        out.write(f"{id},\n")

total = len(idArr)
currDone = 0
idToData = {}

# for id in idArr:
#     response = requests.request("GET", url+idArr[0])
#     currDone+=1
#     if response.status_code != 200:
#         print(f"Error on id {id}")
#         break
#     if currDone % 1000 == 0:
#         print(f"{currDone} out of {total} done.")
#     print(id)
#     idToData[id] = response.text