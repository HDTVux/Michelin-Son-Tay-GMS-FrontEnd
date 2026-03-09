import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchServiceTicketDetail, updateServiceTicket } from '../../../services/serviceTicketService.js';

// --------- Ticket detail loading ---------
export function useServiceTicketDetailData(ticketCodeParam, ticketFromState) {
	const [ticketRaw, setTicketRaw] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		const token = localStorage.getItem('authToken');
		if (!token) {
			setError('Vui lòng đăng nhập để xem chi tiết phiếu dịch vụ.');
			setIsLoading(false);
			return;
		}

		if (!ticketCodeParam) {
			setError('Thiếu ticketCode để xem chi tiết.');
			setIsLoading(false);
			return;
		}

		let ignore = false;
		const load = async () => {
			try {
				setIsLoading(true);
				setError('');
				const res = await fetchServiceTicketDetail(ticketCodeParam, token);
				if (ignore) return;
				setTicketRaw(res?.data ?? null);
			} catch (err) {
				if (ignore) return;
				const msg = err?.message || 'Không thể tải chi tiết phiếu dịch vụ.';
				const isUnauthorized = err?.status === 401 || err?.status === 403;
				if (isUnauthorized) {
					localStorage.removeItem('authToken');
					setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
				} else {
					setError(msg);
				}
				// fallback: if we have state ticket, keep showing it
				setTicketRaw((prev) => prev ?? ticketFromState ?? null);
			} finally {
				if (!ignore) setIsLoading(false);
			}
		};

		load();
		return () => {
			ignore = true;
		};
	}, [ticketCodeParam, ticketFromState]);

	return {
		ticketRaw,
		setTicketRaw,
		isLoading,
		error,
		setError,
	};
}

// --------- Editing logic ---------
function extractCatalogItemIdsFromTicket(ticketLike) {
	const list = Array.isArray(ticketLike?.services) ? ticketLike.services : [];
	return list
		// API may still name catalogId as serviceId.
		.map((s) => s?.catalogId ?? s?.serviceId ?? s?.id)
		.map(Number)
		.filter((n) => Number.isFinite(n) && n > 0);
}

function getSaveEditGuardError({ ticketCodeParam, isImmutable }) {
	if (!ticketCodeParam) return 'Thiếu ticketCode để cập nhật.';
	if (isImmutable) return 'Phiếu dịch vụ này không thể chỉnh sửa.';
	return '';
}

export function useServiceTicketEditing({ ticketCodeParam, isImmutable, ticketRaw, ticket, setTicketRaw, setError, notify }) {
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [editForm, setEditForm] = useState({ customerRequest: '' });

	const initialEditState = useMemo(() => {
		const request = String(ticketRaw?.customerRequest ?? ticket?.requestNote ?? '').trim();
		return { request };
	}, [ticketRaw, ticket]);

	const toggleEdit = useCallback(() => {
		if (isSaving) return;
		if (!isEditing && isImmutable) {
			setError('Phiếu dịch vụ này không thể chỉnh sửa.');
			return;
		}

		setError('');
		setIsEditing((prev) => {
			const next = !prev;
			if (next) {
				setEditForm({ customerRequest: initialEditState.request });
			}
			return next;
		});
	}, [isSaving, isEditing, isImmutable, setError, initialEditState]);

	const cancelEdit = useCallback(() => setIsEditing(false), []);

	const saveEdit = useCallback(async () => {
		if (isSaving) return;

		const guardError = getSaveEditGuardError({ ticketCodeParam, isImmutable });
		if (guardError) {
			setError(guardError);
			return;
		}

		const token = localStorage.getItem('authToken');
		if (!token) {
			setError('Vui lòng đăng nhập để lưu thay đổi.');
			return;
		}

		const customerRequest = String(editForm.customerRequest || '').trim();
		const catalogItemIds = extractCatalogItemIdsFromTicket(ticketRaw ?? ticket);
		if (!catalogItemIds.length) {
			setError('Không tìm thấy dịch vụ hiện có của ticket để cập nhật.');
			return;
		}

		try {
			setIsSaving(true);
			setError('');
			const res = await updateServiceTicket(
				ticketCodeParam,
				{
					customerRequest,
					// Keep services unchanged; backend requires not-null list.
					catalogItemIds,
					// Backward-compat (if backend still reads serviceIds)
					serviceIds: catalogItemIds,
				},
				token,
			);

			setTicketRaw(res?.data ?? null);
			setIsEditing(false);
			notify(res?.message || 'Cập nhật phiếu dịch vụ thành công.');
		} catch (err) {
			setError(err?.message || 'Không thể cập nhật phiếu dịch vụ.');
		} finally {
			setIsSaving(false);
		}
	}, [isSaving, ticketCodeParam, isImmutable, editForm.customerRequest, ticketRaw, ticket, setError, setTicketRaw, notify]);

	return {
		isEditing,
		isSaving,
		editForm,
		setEditForm,
		toggleEdit,
		cancelEdit,
		saveEdit,
	};
}
