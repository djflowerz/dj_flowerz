with open('context/DataContext.tsx', 'r') as f:
    lines = f.readlines()

opens = 0
closes = 0
for i, line in enumerate(lines):
    opens += line.count('{')
    closes += line.count('}')
    if closes > opens:
        print(f"Extra closing brace at line {i+1}")
        break
