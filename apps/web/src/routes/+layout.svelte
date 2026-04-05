<script lang="ts">
    import '../app.css';
    import Shell from '$lib/components/dashboard/Shell.svelte';

    let { children } = $props();
</script>

<svelte:head>
    <title>Pasmello</title>
</svelte:head>

<Shell>
    {@render children()}
</Shell>
