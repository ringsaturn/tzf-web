# Define arrays
files=("index.html" "simple.html" "LICENSE" "README.md")
urls=(
    "https://ringsaturn.github.io/tzf-web/"
    "https://ringsaturn.github.io/tzf-web/simple"
    "https://ringsaturn.github.io/tzf-web/LICENSE"
    "https://ringsaturn.github.io/tzf-web/README.md"
)
changefreq=("weekly" "weekly" "yearly" "monthly")
priority=("1.0" "0.8" "0.3" "0.5")

# Create sitemap.xml
cat > sitemap.xml << EOL
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
EOL

# Generate entries for each file
for i in "${!files[@]}"; do
    # Get last modified date and convert to ISO 8601 format with timezone
    date=$(git log -1 --format=%cd --date=iso-strict "${files[$i]}")
    
    # Append URL entry to sitemap.xml
    cat >> sitemap.xml << EOL
  <url>
    <loc>${urls[$i]}</loc>
    <lastmod>$date</lastmod>
    <changefreq>${changefreq[$i]}</changefreq>
    <priority>${priority[$i]}</priority>
  </url>
EOL
done

# Close the XML file
cat >> sitemap.xml << EOL
</urlset>
EOL

