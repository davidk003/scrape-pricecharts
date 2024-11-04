import pandas as pd

PC_TO_TCG_CSV = "final_map.csv"
PC_CSV = "price-guide.csv"
TCG_CSV = "pokemon-tcg-dataset(1999-2023).csv"
STATS_CSV = "pokemon_datamined_dataset.csv"

PC_df = pd.read_csv(PC_CSV, low_memory=False)
TCG_df = pd.read_csv(TCG_CSV, low_memory=False)
conversion_df = pd.read_csv(PC_TO_TCG_CSV, low_memory=False)
stats_df = pd.read_csv(STATS_CSV, low_memory=False)

PC_df = PC_df[PC_df['id'].isin(conversion_df['id'])] #Only keep ids that are in TCG
print(len(PC_df)==len(PC_df["id"].unique())) #All ids are unique
print(f"Num of cards: {len(PC_df['id'])}")
df_total = PC_df.merge(conversion_df, on='id', how='outer')
# df_total.dropna(subset=['id'], inplace=True)
print(type(df_total["tcg_id"][0]))
print(type(TCG_df["id"][0]))
df_total = df_total.merge(TCG_df, left_on='tcg_id', right_on='id', how='outer')

df_total.drop(columns=['id_y'], inplace=True)
df_total.dropna(subset=['id_x'], inplace=True)
df_total.rename(columns={'id_x': 'id'}, inplace=True)
first = df_total.pop('tcg_id')
df_total.insert(0, 'tcg_id', first)

df_total

df_total.to_csv("combined_dataset.csv", index=False)
