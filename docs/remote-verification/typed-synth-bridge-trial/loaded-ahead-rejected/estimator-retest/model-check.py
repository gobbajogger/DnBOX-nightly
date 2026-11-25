# Calculated example; no replay/qualification claims.
lat=240
def cost(mask,c,early=0):
 t=[early,lat if mask else 0]
 k=mask&1; t[k]+=c[0]; s=t[k]
 for j in range(1,4):
  k=(mask>>j)&1; mix=c[j]>>4
  t[k]+=c[j]-mix-(early if j==2 else 0)
  t[k]=max(t[k],s)+mix; s=t[k]
 t[(mask>>4)&1]+=c[4]
 return max(t)
# 909 / inactive 808 / A / B / inactive break, ticks from last A-ahead RAM
c=[62133,0,73697,16038,0]
p=c[2]-(c[2]>>3)
serial=cost(0,c)
old=cost(1,c)
new=cost(1,c,p)
assert serial<old and new*8<serial*7
print(f"Serial {serial} ticks, old remote 909 {old}, early-aware remote 909 {new}")
