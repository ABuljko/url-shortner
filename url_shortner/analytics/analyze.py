import pandas as pd

# Assume logs.csv contains timestamp, short_code, ip, referrer, user_agent
df = pd.read_csv('logs.csv')

# Basic analytics
clicks_per_link = df['short_code'].value_counts()
print("Clicks per link:")
print(clicks_per_link)

top_referrers = df['referrer'].value_counts().head(5)
print("\nTop referrers:")
print(top_referrers)
