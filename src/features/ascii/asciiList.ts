export interface AsciiItem {
  // /ascii/<slug> 로 열린다
  slug: string;
  name: string;
  description: string;
}

// 아스키 작품을 추가하면 여기에 한 줄 넣고 src/app/ascii/<slug>/page.tsx 를 만든다
export const ASCII_LIST: AsciiItem[] = [
  {
    slug: 'donut',
    name: '도넛',
    description: '글자 열두 개로 음영을 넣은 도넛이 두 축으로 돈다.',
  },
];
