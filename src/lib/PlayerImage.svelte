<script lang="ts">
	export let isOpponent: boolean = false;
	export let width: number = 40;
	export let height: number = 50;

	$: fillColor = isOpponent ? '#bbb' : '#4b9cff';
</script>

<svg {width} {height} viewBox="0 0 40 50">
	<circle cx="20" cy="15" r="10" fill={fillColor} />
	<rect x="10" y="25" width="20" height="20" rx="8" fill={fillColor} />
</svg>
