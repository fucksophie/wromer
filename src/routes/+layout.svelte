<script lang="ts">
	import '../app.css';
	let { children } = $props();

	let title = $state('');
	let latestUpdate = '';

	function updateTitle() {
		title = 'Wromer';
		const path = window.location.pathname;
		const segments = path.split('/').filter(Boolean);
		const mapped = segments.map((str: string) => {
			return str.charAt(0).toUpperCase() + str.slice(1);
		});
		if (mapped.length > 0) {
			for (const seg of mapped) {
				title += ' > ' + seg;
			}
		}

		document.title = title;
	}

	setInterval(() => {
		if (latestUpdate != window.location.pathname) {
			updateTitle();
			latestUpdate = window.location.pathname;
		}
	}, 100);

	updateTitle();
</script>

<div class="mb-4 navbar border-b border-base-300 bg-base-200">
	<div class="container mx-auto items-center">
		<a href="/" class="text-xl font-bold text-primary transition-colors hover:text-secondary">
			{title}
		</a>
		<div class="text-md font-bold">wromer.sad.ovh</div>
	</div>
</div>

{@render children()}
