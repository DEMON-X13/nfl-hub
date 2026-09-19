"""The prop model's admin page loses its "Refresh site now" link.

The link opened the job's Run workflow page, and a manual run pulls fresh prices by
default, about 7 credits a game. The scheduled pulls already price every game once,
and the owner does not want a manual run eating into the 500-a-month balance, so the
link goes. The job can still be run from GitHub's Actions tab if it is ever needed;
the "Updated ..." note in the header stays.
"""
from pathlib import Path

p = Path(__file__).with_name('publish.js')
s = p.read_text(encoding='utf-8')
start = "/* admin only: a link straight to the job's Run workflow page, the manual refresh */\n"
end = "  st.insertAdjacentElement('afterend',a);\n});\n"
assert s.count(start) == 1 and s.count(end) == 1
i = s.index(start); j = s.index(end, i) + len(end)
s = s[:i] + s[j:]
p.write_text(s, encoding='utf-8', newline='\n')
print('Refresh site now link removed from the props admin page')
