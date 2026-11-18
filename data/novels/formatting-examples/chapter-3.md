# The expedition ledger

Mara laid out the supplies before setting off:

| Item | Packed by | Quantity |
| :--- | :---: | ---: |
| **Maps** | Mara | 3 |
| Compass | Ivo | 1 |
| Water flasks | Both | 4 |

Write a header row, a separator row, and then the data rows:

```markdown
| Item | Packed by | Quantity |
| :--- | :---: | ---: |
| **Maps** | Mara | 3 |
| Compass | Ivo | 1 |
```

The colons in the separator row select left, center, or right alignment. Cells can include **bold**, *italics*, links, inline code, and inline math:

| Route | Distance | Note |
| :--- | ---: | :--- |
| Northern pass | $d = vt = 6\,\mathrm{km}$ | Follow the `north` marker |
| River trail | $d = 4\,\mathrm{km}$ | The sign reads east \| west |

Escape a literal pipe as `\|` inside a cell. Keep each row on one line; merged cells and block content are not supported. Wide tables scroll horizontally within the reading area.
