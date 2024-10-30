import csv
import pandas as pd
import requests


df = pd.read_csv("price-guide.csv")
print(len(df["id"]) == len(df["id"].unique())) #Ids are unique
output = "ids-gethistoric.txt"
with open(output, "w") as out:
    for id in df["id"]:
        out.write(str(id)+"\n")
    
