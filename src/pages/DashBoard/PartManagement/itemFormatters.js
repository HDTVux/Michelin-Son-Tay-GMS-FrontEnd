export const formatCurrencyVnd = (value) => {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	if (!Number.isFinite(n)) return '-';
	return new Intl.NumberFormat('vi-VN').format(Math.round(n));
};

export const formatItemTypeLabel = (itemType) => {
	if (itemType === 'PART') return 'Phá»¥ tÃ¹ng';
	if (itemType === 'SERVICE') return 'Dá»‹ch vá»¥';
	return itemType || '-';
};

const pickFirstText = (item, keys) => {
	for (const key of keys) {
		const value = item?.[key];
		if (value == null) continue;
		const text = String(value).trim();
		if (text) return text;
	}
	return '-';
};

export const getItemOriginText = (item) =>
	pickFirstText(item, [
		'origin',
		'itemOrigin',
		'originCountry',
		'countryOfOrigin',
		'country_origin',
		'madeIn',
	]);

export const getItemColorText = (item) =>
	pickFirstText(item, [
		'color',
		'itemColor',
		'colour',
		'productColor',
		'catalogColor',
	]);
