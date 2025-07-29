<script lang="ts">
	import Fa from 'svelte-fa';
	import '../app.css';
	import { faGithub } from '@fortawesome/free-brands-svg-icons';
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

<div class="neutral navbar border-b border-base-300">
	<div class="flex w-full flex-row justify-around">
		<div class="flex flex-col">
			<a href="/" class="text-xl font-bold text-primary transition-colors hover:text-secondary">
				{title}
			</a>
			<div class="text-md font-bold">wromer.sad.ovh</div>
		</div>
		<div class="flex flex-col justify-center">
			<a href="https://github.com/fucksophie/wromer">
				<Fa size="lg" icon={faGithub}></Fa>
			</a>
		</div>
	</div>
</div>

{@render children()}
