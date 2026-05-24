import re
with open(".env.local") as f:
    c = f.read()
pk = re.search(r"ALIPAY_PRIVATE_KEY=(.+)", c).group(1).strip()
with open("_alipay_key.txt", "w") as f:
    f.write(pk)
print("done, len:", len(pk))
