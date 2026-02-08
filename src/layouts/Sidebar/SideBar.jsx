import './SideBar.css';

const navItems = [
	{ label: 'Home', icon: <IconHome /> },
	{ label: 'Profil', icon: <IconUser /> },
	{ label: 'History', icon: <IconHistory /> },
	{ label: 'Author', icon: <IconEdit /> },
	{ label: 'Notifications', icon: <IconBell /> },
	{ label: 'Help', icon: <IconHelp /> },
	{ label: 'Setting', icon: <IconSettings /> },
];

const SideBar = () => {
	return (
		<aside className="sidebar">
			<div className="sidebar__profile">
				<div className="sidebar__avatar">
					<img src="https://i.pravatar.cc/80?img=64" alt="User avatar" />
				</div>
				<div>
					<p className="sidebar__greeting">Hello,</p>
					<p className="sidebar__name">Adiwarda Bestari</p>
				</div>
			</div>

			<nav className="sidebar__nav">
				{navItems.map((item) => (
					<button className="navItem" key={item.label} type="button">
						<span className="navItem__icon">{item.icon}</span>
						<span className="navItem__label">{item.label}</span>
					</button>
				))}
			</nav>

			<button className="sidebar__logout" type="button">
				<IconLogout />
				<span>Logout</span>
			</button>
		</aside>
	);
};

function IconHome() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M4 9.5 12 3l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
		</svg>
	);
}

function IconUser() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5m0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5" />
		</svg>
	);
}

function IconHistory() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M4 5.5V10h4.5l-1.8-1.8A6.5 6.5 0 1 1 5 12H3a9 9 0 1 0 2.1-5.5z" />
			<path d="M12 7v5l3.5 2.1.8-1.3-2.8-1.7V7z" />
		</svg>
	);
}

function IconEdit() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="m3 17.25 9.94-9.94 3.75 3.75L6.75 21H3z" />
			<path d="m14.77 5.19 2.04-2.04a1.5 1.5 0 0 1 2.12 0l1.92 1.92a1.5 1.5 0 0 1 0 2.12l-2.04 2.04z" />
		</svg>
	);
}

function IconBell() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22m6-6V11a6 6 0 0 0-5-5.91V4a1 1 0 0 0-2 0v1.09A6 6 0 0 0 6 11v5l-2 2v1h16v-1z" />
		</svg>
	);
}

function IconHelp() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m.25 16.5h-1.5v-1.5h1.5zm1.8-6.14-.84.76a2 2 0 0 0-.71 1.54v.34h-1.5v-.34a3.44 3.44 0 0 1 1.21-2.64l.83-.75a1.39 1.39 0 0 0 .46-1 1.5 1.5 0 0 0-1.5-1.5 1.5 1.5 0 0 0-1.5 1.5h-1.5a3 3 0 0 1 6 0 3.09 3.09 0 0 1-.95 2.09" />
		</svg>
	);
}

function IconSettings() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5m8.14-2.39-1.36-.76a6.52 6.52 0 0 0 0-1.7l1.36-.76a.5.5 0 0 0 .21-.68l-1.5-2.6a.5.5 0 0 0-.64-.21l-1.35.78a6.4 6.4 0 0 0-1.46-.85l-.2-1.54a.5.5 0 0 0-.5-.44h-3a.5.5 0 0 0-.5.44l-.2 1.54a6.4 6.4 0 0 0-1.46.85L5.79 6.3a.5.5 0 0 0-.64.21l-1.5 2.6a.5.5 0 0 0 .21.68l1.36.76a6.52 6.52 0 0 0 0 1.7l-1.36.76a.5.5 0 0 0-.21.68l1.5 2.6a.5.5 0 0 0 .64.21l1.35-.78a6.4 6.4 0 0 0 1.46.85l.2 1.54a.5.5 0 0 0 .5.44h3a.5.5 0 0 0 .5-.44l.2-1.54a6.4 6.4 0 0 0 1.46-.85l1.35.78a.5.5 0 0 0 .64-.21l1.5-2.6a.5.5 0 0 0-.21-.68M12 9.5A2.5 2.5 0 1 1 9.5 12 2.5 2.5 0 0 1 12 9.5" />
		</svg>
	);
}

function IconLogout() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M16 17v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v2h-2V5H5v14h9v-2z" />
			<path d="m14 13-6 .02V11h6V8l6 4z" />
		</svg>
	);
}

function IconSun() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M12 8a4 4 0 1 1-4 4 4 4 0 0 1 4-4m0-3 1.06 2.06L15 6l-2.06 1.06L12 9l-1.06-1.94L9 6l1.94-.94zm0 13-1.06-2.06L9 18l1.94-1.06L12 15l1.06 1.94L15 18l-1.94.94zM6 12l2.06-1.06L6 9l.94 1.94L9 12l-2.06 1.06L6 15zm12 0-2.06 1.06L18 15l-.94-1.94L15 12l2.06-1.06L18 9z" />
		</svg>
	);
}

function IconMoon() {
	return (
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M21 15.5A9 9 0 0 1 9.5 3a7 7 0 1 0 11.5 12.5" />
		</svg>
	);
}

export default SideBar;
