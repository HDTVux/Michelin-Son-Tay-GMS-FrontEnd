export const formatCurrencyVnd = (value) => {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	if (!Number.isFinite(n)) return '-';
	return new Intl.NumberFormat('vi-VN').format(Math.round(n));
};

export const formatItemTypeLabel = (itemType) => {
	if (itemType === 'PART') return 'Phụ tùng';
	if (itemType === 'SERVICE') return 'Dịch vụ';
	return itemType || '-';
};
