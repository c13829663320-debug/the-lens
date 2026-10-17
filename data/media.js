// Production media remains behind the approved + canonical manifest gate.
// These local-only draft clips let the browser preview play the generated
// material for review without making unreviewed media part of the release
// manifest or the WeChat package.
const previewRoot='/server/media/';
const previewClips={
  S10:{url:previewRoot+'cg_s10_montage_t01_v01_720p.mp4'},
  S01:{url:previewRoot+'cg_s01_reveal_720p_v1.mp4'},
  S02:{url:previewRoot+'cg_s02_lens_reveal_t01_v01_720p.mp4'},
  S05:{url:previewRoot+'cg_s05_missed_bridge_t01_v01_720p.mp4'},
  S09:{url:previewRoot+'cg_s09_drawing_stars_t01_v01_720p.mp4'},
  END:{url:previewRoot+'cg_end_morning_t01_v01_720p.mp4'}
};

// Use your Aliyun HTTPS domain and enable request/download legal domains in WeChat.
module.exports={
  baseUrl:'',
  clips:{},
  previewClips,
  sceneClips:{
    S10:'cg_s10_montage',
    S01:'cg_s01_reveal',
    S02:'cg_s02_lens_reveal',
    S05:'cg_s05_missed_bridge',
    S09:'cg_s09_drawing_stars',
    END:'cg_end_morning'
  },
  manifestPath:'/api/media-manifest'
};
