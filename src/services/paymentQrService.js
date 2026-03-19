import QR from '../assets/QR.png';

function toMoneyNumber(value) {
	const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
	return Number.isFinite(n) ? n : 0;
}

export async function createTransferQr({ amountVnd, description, reference }) {
	const normalizedAmount = Math.max(0, Math.round(toMoneyNumber(amountVnd)));
	const normalizedDescription = String(description || '').trim();
	const normalizedReference = String(reference || '').trim();

	return {
		provider: 'VietQR',
		imageSrc: QR,
		amountVnd: normalizedAmount,
		description: normalizedDescription,
		reference: normalizedReference,
	};
}
