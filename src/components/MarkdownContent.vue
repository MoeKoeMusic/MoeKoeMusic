<template>
    <div class="markdown-content">
        <template v-for="(block, blockIndex) in blocks" :key="blockIndex">
            <component :is="block.tag" v-if="block.type === 'heading'">
                <template v-for="(token, tokenIndex) in tokenizeMarkdownInline(block.text)" :key="tokenIndex">
                    <component :is="tokenComponent(token)" v-bind="tokenProps(token)">
                        {{ token.text }}
                    </component>
                </template>
            </component>

            <p v-else-if="block.type === 'paragraph'">
                <template v-for="(token, tokenIndex) in tokenizeMarkdownInline(block.text)" :key="tokenIndex">
                    <component :is="tokenComponent(token)" v-bind="tokenProps(token)">
                        {{ token.text }}
                    </component>
                </template>
            </p>

            <blockquote v-else-if="block.type === 'quote'">
                <template v-for="(token, tokenIndex) in tokenizeMarkdownInline(block.text)" :key="tokenIndex">
                    <component :is="tokenComponent(token)" v-bind="tokenProps(token)">
                        {{ token.text }}
                    </component>
                </template>
            </blockquote>

            <pre v-else-if="block.type === 'code'"><code>{{ block.text }}</code></pre>

            <ul v-else-if="block.type === 'list'">
                <li v-for="(itemText, itemIndex) in block.items" :key="itemIndex">
                    <template v-for="(token, tokenIndex) in tokenizeMarkdownInline(itemText)" :key="tokenIndex">
                        <component :is="tokenComponent(token)" v-bind="tokenProps(token)">
                            {{ token.text }}
                        </component>
                    </template>
                </li>
            </ul>

            <ol v-else-if="block.type === 'ordered-list'">
                <li v-for="(itemText, itemIndex) in block.items" :key="itemIndex">
                    <template v-for="(token, tokenIndex) in tokenizeMarkdownInline(itemText)" :key="tokenIndex">
                        <component :is="tokenComponent(token)" v-bind="tokenProps(token)">
                            {{ token.text }}
                        </component>
                    </template>
                </li>
            </ol>
        </template>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { openRegisterUrl } from '../utils/utils';

const props = defineProps({
    content: {
        type: String,
        default: ''
    },
    repoUrl: {
        type: String,
        default: 'https://github.com/MoeKoeMusic/MoeKoeMusic'
    }
});

const blocks = computed(() => parseMarkdownBlocks(props.content));

const parseMarkdownBlocks = (markdown = '') => {
    const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
    const blocks = [];
    let index = 0;

    while (index < lines.length) {
        const trimmed = lines[index].trim();

        if (!trimmed) {
            index += 1;
            continue;
        }

        if (trimmed.startsWith('```')) {
            const codeLines = [];
            index += 1;
            while (index < lines.length && !lines[index].trim().startsWith('```')) {
                codeLines.push(lines[index]);
                index += 1;
            }
            blocks.push({ type: 'code', text: codeLines.join('\n') });
            index += 1;
            continue;
        }

        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            blocks.push({
                type: 'heading',
                tag: `h${Math.min(6, headingMatch[1].length + 1)}`,
                text: headingMatch[2].trim()
            });
            index += 1;
            continue;
        }

        if (/^>\s?/.test(trimmed)) {
            const quoteLines = [];
            while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
                quoteLines.push(lines[index].trim().replace(/^>\s?/, ''));
                index += 1;
            }
            blocks.push({ type: 'quote', text: quoteLines.join(' ') });
            continue;
        }

        if (/^[-*]\s+/.test(trimmed)) {
            const items = [];
            while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
                items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
                index += 1;
            }
            blocks.push({ type: 'list', items });
            continue;
        }

        if (/^\d+\.\s+/.test(trimmed)) {
            const items = [];
            while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
                items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
                index += 1;
            }
            blocks.push({ type: 'ordered-list', items });
            continue;
        }

        const paragraphLines = [];
        while (
            index < lines.length &&
            lines[index].trim() &&
            !lines[index].trim().startsWith('```') &&
            !/^(#{1,6})\s+/.test(lines[index].trim()) &&
            !/^>\s?/.test(lines[index].trim()) &&
            !/^[-*]\s+/.test(lines[index].trim()) &&
            !/^\d+\.\s+/.test(lines[index].trim())
        ) {
            paragraphLines.push(lines[index].trim());
            index += 1;
        }
        blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') });
    }

    return blocks;
};

const tokenizeMarkdownInline = (text) => {
    const tokens = [];
    const pattern = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|(https?:\/\/[^\s)]+)|#(\d+)|@([A-Za-z0-9-]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            tokens.push({ type: 'text', text: text.slice(lastIndex, match.index) });
        }

        if (match[2]) {
            tokens.push({ type: 'strong', text: match[2] });
        } else if (match[4]) {
            tokens.push({ type: 'code', text: match[4] });
        } else if (match[6] && match[7]) {
            tokens.push({ type: 'link', text: match[6], url: match[7] });
        } else if (match[8]) {
            tokens.push({ type: 'link', text: match[8], url: match[8] });
        } else if (match[9]) {
            tokens.push({ type: 'link', text: match[0], url: `${props.repoUrl}/issues/${match[9]}` });
        } else {
            tokens.push({ type: 'link', text: match[0], url: `https://github.com/${match[10]}` });
        }

        lastIndex = pattern.lastIndex;
    }

    if (lastIndex < text.length) {
        tokens.push({ type: 'text', text: text.slice(lastIndex) });
    }

    return tokens;
};

const tokenComponent = (token) => {
    if (token.type === 'link') return 'a';
    if (token.type === 'code') return 'code';
    if (token.type === 'strong') return 'strong';
    return 'span';
};

const tokenProps = (token) => {
    if (token.type !== 'link') return {};
    return {
        href: token.url,
        target: '_blank',
        rel: 'noopener noreferrer',
        onClick: (event) => {
            event.preventDefault();
            openRegisterUrl(token.url);
        }
    };
};
</script>

<style lang="scss" scoped>
.markdown-content {
    color: #333;
    font-size: 14px;
    line-height: 1.65;

    h2,
    h3,
    h4,
    h5,
    h6 {
        margin: 14px 0 8px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(var(--primary-color-rgb), 0.16);
        color: #222;
        font-size: 16px;
        line-height: 1.35;
    }

    h2:first-child,
    h3:first-child,
    h4:first-child {
        margin-top: 0;
    }

    p,
    blockquote,
    ul,
    ol,
    pre {
        margin: 0 0 10px;
    }

    ul,
    ol {
        padding-left: 22px;
    }

    li + li {
        margin-top: 4px;
    }

    a {
        color: var(--primary-color);
        text-decoration: none;
        display: inline;

        &:hover {
            text-decoration: underline;
        }
    }

    blockquote {
        padding-left: 12px;
        border-left: 4px solid rgba(var(--primary-color-rgb), 0.22);
        color: #666;
    }

    code {
        padding: 2px 5px;
        border-radius: 5px;
        background: rgba(var(--primary-color-rgb), 0.08);
        color: #333;
        font-family: Consolas, Monaco, monospace;
        font-size: 13px;
    }

    pre {
        overflow-x: auto;
        padding: 10px 12px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.04);
    }

    pre code {
        margin: 0;
        white-space: pre-wrap;
        padding: 0;
        background: transparent;
    }
}
</style>
