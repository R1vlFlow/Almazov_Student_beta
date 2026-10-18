const normalize = (s) => s.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[«»"']/g, '').replace(/\s+/g, ' ').trim();
export function matchCourseAddresses(directory, locations) {
    const matched = new Set();
    const unresolved = [];
    for (const raw of new Set(locations.map(x => x.trim()).filter(Boolean))) {
        const text = normalize(raw);
        const candidates = directory.filter(item => {
            const name = normalize(item.name), address = normalize(item.address);
            const token = (s) => new RegExp('(^|[^а-яa-z])' + s + '(?=$|[^а-яa-z])', 'u').test(text);
            if (name.startsWith('клинико-поликлинический') && token('кпк'))
                return true;
            if (name.startsWith('центр доклинических') && token('цдти'))
                return true;
            if (name.startsWith('детский лечебно') && token('длрк'))
                return true;
            if (name.startsWith('федеральный перинатальный') && token('пц'))
                return true;
            if (name === 'институт медицинского образования' && token('имо'))
                return true;
            if (name.includes('солнечный') && text.includes('солнечное')) {
                const letter = address.match(/лит\.\s*([а-я])/u)?.[1];
                return !!letter && new RegExp('лит\\.?\\s*' + letter + '(?=$|[^а-я])', 'u').test(text);
            }
            // Full institution name is reliable; generic/partial names are not.
            if (name.length > 20 && text.includes(name))
                return true;
            // Require an explicit street AND house; room numbers alone cannot match.
            const street = address.match(/(?:ул\.|пр-т|пр\.|пер\.|проспект|улица)\s*([^,]+)/u)?.[1]?.trim();
            const house = address.match(/(?:^|[\s,])д\.?\s*([0-9]+(?:[а-я]|\/[0-9]+)?)/u)?.[1];
            if (!street || !house || !text.includes(street))
                return false;
            if (!new RegExp('(?:д\\.?|дом)\\s*' + house.replace('/', '\\/') + '(?=$|[^0-9а-я/])', 'u').test(text))
                return false;
            const letter = address.match(/лит\.\s*([а-я])/u)?.[1];
            return !letter || new RegExp('лит\\.?\\s*' + letter + '(?=$|[^а-я])', 'u').test(text);
        });
        if (candidates.length === 1)
            matched.add(candidates[0]);
        else
            unresolved.push(raw);
    }
    return { addresses: directory.filter(x => matched.has(x)), unresolved };
}
