#!/usr/bin/env python3
"""Parse coverage HTML files to find exact uncovered line numbers."""
import re
import os

coverage_dir = os.path.join(os.path.dirname(__file__), '..', 'coverage')
files = [
    'draft-store.js.html',
    'fantasy-scorer.js.html',
    'fantasy-team-scorer.js.html'
]

for fname in files:
    path = os.path.join(coverage_dir, fname)
    with open(path) as f:
        content = f.read()
    
    # V8 Istanbul HTML uses: <td class="line-count ..."> then source lines
    # Lines with count=0 are highlighted differently
    # Find line numbers that appear with yellow/red background indicating no coverage
    # Pattern: look for hit=0 or count=0 markers near line anchors
    
    # Try to find the line hit counts table
    # Format: <tr><td class="line-count quiet">..line numbers..</td>
    #         <td class="line-coverage">..</td>
    #         <td class="text"><span class="hits">N</span>code</td>
    
    # Look for spans with 0 counts
    zero_lines = re.findall(r'<a[^>]*name=["\']L(\d+)["\'][^>]*>.*?<span[^>]*class=["\'][^"\']*cov-[^"\']*["\'][^>]*>0</span>', content, re.DOTALL)
    
    # Try different pattern - look for the hit count columns
    # in the coverage format: line number td, count td, source td
    lines_with_counts = re.findall(r'href=["\']#L(\d+)["\']>(\d+)</a>', content)
    
    # Alternative: look for count=0 in the data
    # The v8 HTML report has a format like:
    # <span data-count="0" class="cov-0">source code</span>
    hits_zero = re.findall(r'L(\d+).*?data-count="0"', content)
    
    print(f'\n=== {fname} ===')
    print(f'Line numbers in file: {len(lines_with_counts)} anchors found')
    
    # Look for cov-0 class pattern
    cov_zero = re.findall(r'name=["\']L(\d+)["\']', content)
    
    # Try to find actual coverage markers
    # Look at a small section to understand the format
    sample_idx = content.find('name=\'L60\'') if 'name=\'L60\'' in content else content.find('name="L60"')
    if sample_idx > 0:
        print(f'Sample around L60:')
        print(repr(content[sample_idx:sample_idx+500]))
