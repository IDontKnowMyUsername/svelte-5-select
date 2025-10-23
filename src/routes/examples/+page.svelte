<script lang="ts">

</script>

<div class="container">
    <header>
        <img src="/svelte-select.png" alt="Svelte Select" />
        <aside>
            <h1>Svelte 5 Select /</h1>
            <h2>Examples</h2>
        </aside>
    </header>

    <div class="badges">
        <a href="https://npmjs.org/package/svelte-5-select">
            <img src="https://badgen.now.sh/npm/v/svelte-5-select" alt="version" />
        </a>
        <a href="https://npmjs.org/package/svelte-5-select">
            <img src="https://badgen.now.sh/npm/dm/svelte-5-select" alt="downloads" />
        </a>
        <a href="https://github.com/rob-balfre/svelte-5-select">
            <img src="https://badgen.net/badge/icon/github?icon=github&label" alt="downloads" />
        </a>
    </div>
    <div style="width:80%;margin-top:4rem;">

    </div>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    header {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
    }

    header img {
        width: 50px;
    }

    h1 {
        font-size: 16px;
        margin: 0;
        text-transform: uppercase;
        color: #999;
    }

    h2 {
        margin: 0;
        font-size: 36px;
    }

    .badges {
        display: flex;
        gap: 10px;
    }

    .badges a {
        display: flex;
    }

    @media (min-width: 800px) {
        header img {
            width: 93px;
            margin: 0;
        }

        aside {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
        }

        h1 {
            font-size: 24px;
            line-height: 0;
        }

        h2 {
            font-size: 68px;
        }
    }
</style>