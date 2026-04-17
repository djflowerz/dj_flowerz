with open('context/DataContext.tsx', 'r') as f:
    lines = f.readlines()

opens = 0
closes = 0
for i, line in enumerate(lines):
    opens += line.count('(')
    closes += line.count(')')
    if closes > opens:
        print(f"Extra closing parenthesis at line {i+1}")
        break

if opens > closes:
    print(f"Missing {opens - closes} closing parentheses by end of file")
