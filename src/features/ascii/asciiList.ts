export interface AsciiItem {
  // /ascii/<slug> 로 열린다
  slug: string;
  name: string;
  description: string;
}

// 아스키 작품을 추가하면 여기에 한 줄 넣고 src/app/ascii/<slug>/page.tsx 를 만든다
export const ASCII_LIST: AsciiItem[] = [
  {
    slug: 'namsan',
    name: '남산',
    description: '남산타워를 바라보는 두 사람의 뒷모습 위로 불꽃이 터진다.',
  },
  {
    slug: 'starry-night',
    name: '별이 빛나는 밤',
    description: '고흐의 그림을 붓 자국 3,200개가 소용돌이를 따라 떠도는 흐름으로 옮겼다.',
  },
  {
    slug: 'galaxy',
    name: '은하',
    description: '별 7,000개가 제각기 떠도는 나선 은하를 기울기를 바꿔 가며 본다.',
  },
  {
    slug: 'tree',
    name: '트리',
    description: '글자로 만든 트리가 돌고 전구 170개가 깜박인다.',
  },
  {
    slug: 'fireworks',
    name: '강변 불꽃놀이',
    description: '도시 위로 터진 불꽃이 강물에 비쳐 일렁인다.',
  },
  {
    slug: 'rose',
    name: '장미',
    description: '줄기가 자라고 봉오리가 여덟 초에 걸쳐 벌어진다.',
  },
  {
    slug: 'bigbang',
    name: '별빛',
    description: '한 점에서 별 1,500개가 꼬리를 끌며 뻗어 나간다.',
  },
  {
    slug: 'donut',
    name: '도넛',
    description: '글자 열두 개로 음영을 넣은 도넛이 두 축으로 돈다.',
  },
];
