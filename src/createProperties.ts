import { FeedEntry } from 'https://deno.land/x/rss@0.6.0/src/types/mod.ts';
import AtprotoAPI from 'npm:@atproto/api';
import defaultsGraphemer from 'npm:graphemer';

const Graphemer = defaultsGraphemer.default;
const splitter = new Graphemer();

const { BskyAgent, RichText } = AtprotoAPI;
const service = 'https://bsky.social';
const agent = new BskyAgent({ service });

export default async (item: FeedEntry) => {
  const title = item.title?.value || '';
  const link = item.links[0].href || '';

  let rt = new RichText({ text: title });
  await rt.detectFacets(agent);

  // URL部分を短縮
  let text = rt.text;
  let targets: { key: string; link: string }[] = [];
  rt.facets?.forEach((v) => {
    if (
      v.features[0]['$type'] === 'app.bsky.richtext.facet#link' &&
      typeof v.features[0].uri === 'string'
    ) {
      const link = v.features[0].uri;
      const key =
        splitter.countGraphemes(link) <= 27
          ? link
          : splitter.splitGraphemes(link).slice(0, 27).join('') + '...';
      text = text.replace(link, key);
      targets.push({ key, link });
    }
  });

  // 300文字を超える場合は、300文字になるように切り詰める
  const max = 300;
  if (splitter.countGraphemes(text) > max) {
    const ellipsis = `...`;
    const cnt = max - splitter.countGraphemes(ellipsis);
    const shortenedTitle = splitter
      .splitGraphemes(title)
      .slice(0, cnt)
      .join('');
    text = `${shortenedTitle}${ellipsis}`;
  }

  rt = new RichText({ text });
  await rt.detectFacets(agent);

  // 短縮したURLのリンク先を元のURLに置き換え
  rt.facets?.forEach((v, i) => {
    if (
      v.features[0]['$type'] === 'app.bsky.richtext.facet#link' &&
      typeof v.features[0].uri === 'string'
    ) {
      v.features[0].uri = targets[i].link;
    }
  });

  console.log('success createProperties');
  return { rt, title, link };
};