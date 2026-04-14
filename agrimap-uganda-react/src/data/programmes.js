export var PROG_INFO={
  markets:{name:"Markets for Youth",color:"#16a34a",desc:"Agricultural market systems programme connecting rural youth to opportunities from production to market linkages. Active in Central, Eastern, and Northern Uganda.",focus:"Market linkage, aggregation, buyer connections, value chain development",districts:["kampala","wakiso","mukono","luwero","mubende","masaka","jinja","iganga","mbale","soroti","gulu","lira","fortportal","mbarara","masindi"]},
  farmpass:{name:"AgriMap Farmer ID",color:"#2563eb",desc:"Digital agriculture platform digitising farming and connecting rural farmers to markets. Digital farmer ID, crop records, market access.",focus:"Digital farmer ID, crop records, market linkage, input access",districts:["kampala","wakiso","mukono","luwero","mubende","jinja","iganga","mbale","gulu","lira","fortportal","mbarara"]},
  dairy:{name:"Ripple Effect Dairy",color:"#0891b2",desc:"Partnering with Ripple Effect to improve rural youth participation in dairy value chains. Active in Western Uganda.",focus:"Dairy cooperative development, milk collection, cold chain, youth dairy agripreneurs",districts:["hoima","masindi","fortportal","kasese","mbarara","kabale","ntungamo","bushenyi","ibanda","isingiro","kiruhura","sheema","kazo","rwampara"]},
  wfp:{name:"WFP/UNCDF Partnership",color:"#dc2626",desc:"Supporting youth-led agribusinesses to build resilience in Northern and Western Uganda. Emergency food security + microfinance for youth.",focus:"Food security resilience, youth agribusiness, microfinance, emergency support",districts:["gulu","lira","pader","kitgum","arua","pallisa","soroti"]},
  ruforum:{name:"RUFORUM / Gulu University",color:"#7c3aed",desc:"Agri-enterprise development partnership with Gulu University and RUFORUM. Agribusiness training for youth farmers.",focus:"Agribusiness training, enterprise development, agri-tech skills",districts:["gulu","mbale"]},
  divoucher:{name:"Digital Input Voucher System",color:"#ea580c",desc:"Digital credential platform enabling unbanked farmers to access inputs, loans, and market payments.",focus:"Digital ID, input credit, SACCO loans, market payments",districts:["kampala","wakiso","mukono","luwero","mubende","masaka","jinja","iganga","gulu","lira","fortportal","mbarara"]}
};

export var TAB_SUBS={
  production:['crop','yield','srr','varieties'],
  environment:['ndvi','weather','soil','pest'],
  market:['live_prices','market_access','coffee','sell_advice','export'],
  inputs:['fertilizer','seed','agrodealers','digital_vouchers','advisory','calendar'],
  finance:['inclusion','divoucher','saccos','agrifinance'],
  youth:['profile','ussd','vouchers','crop_plan','inputs','market_link','training','programmes','impact'],
  dairy:['dairy_overview','ripple_effect','milk_prices','cooperatives','cold_chain','dairy_finance','dairy_ai'],
  programmes:['overview','markets_for_youth','farmpass','dairy_ripple','wfp_uncdf','ruforum'],
  foundation:['yaw_overview','yaw_score','finance_gap','value_chains','partners','yaw_targets'],
  intelligence:['agriscore','earlywarning','food_security','price_alert'],
  impact:['yaw_dashboard','farmer_tracking','investment_case','data_partnerships'],
  eudr:['eudr_overview','compliance_map','coffee_traceability','eudr_ai'],
  concept:['cn_generator','cn_preview','investment_calc','data_gaps'],
  demo:['demo_launch'],
  datasources:['overview','coffee','crops','livestock','population','finance','prices','satellite','eudr_data'],
  ai:['satellite_ai','soil_ai','seed_ai','yield_forecast','crop_diagnosis','market_ai','farmer_msg','foundation_strategy','ask']
};

export var SUB_LBL={
  crop:'\u{1F33D} Crop',yield:'\u{1F4D0} Yield',srr:'\u{1F4CA} SRR',varieties:'\u{1F331} Varieties',
  ndvi:'\u{1F6F0}\uFE0F NDVI',weather:'\u{1F324}\uFE0F Weather',soil:'\u{1F9EA} Soil',pest:'\u{1F41B} Pest',
  live_prices:'\u{1F4B0} Live Prices',market_access:'\u{1F3EA} Access',coffee:'\u2615 Coffee',sell_advice:'\u{1F4CA} Sell Advice',export:'\u{1F30D} Exports',
  fertilizer:'\u{1F9F4} Fertilizer',seed:'\u{1F331} Seed',agrodealers:'\u{1F3EA} Agro-Dealers',digital_vouchers:'\u{1F3AB} Voucher System',advisory:'\u{1F4CB} Advisory',calendar:'\u{1F4C5} Calendar',
  inclusion:'\u{1F4B3} Inclusion',divoucher:'\u{1F3AB} Input Voucher',saccos:'\u{1F3E6} SACCOs',agrifinance:'\u{1F4BC} AgriFinance',
  profile:'\u{1F464} Profile',ussd:'\u{1F4F1} USSD (*270#)',vouchers:'\u{1F3AB} Input Vouchers',crop_plan:'\u{1F33E} Crop Plan',inputs:'\u{1F9F4} Inputs',market_link:'\u{1F4C8} Market Link',training:'\u{1F393} Training',programmes:'\u{1F5FA}\uFE0F Programmes',impact:'\u{1F3C6} Impact',
  dairy_overview:'\u{1F4CA} Overview',ripple_effect:'\u{1F30A} Ripple Effect',milk_prices:'\u{1F4B0} Milk Prices',cooperatives:'\u{1F91D} Cooperatives',cold_chain:'\u2744\uFE0F Cold Chain',dairy_finance:'\u{1F4B3} Finance',dairy_ai:'\u2728 Dairy AI',
  overview:'\u{1F4CA} Overview',markets_for_youth:'\u{1F33D} Markets for Youth',farmpass:'\u{1F4F1} AgriMap Farmer ID',dairy_ripple:'\u{1F404} Ripple Effect',wfp_uncdf:'\u{1F198} WFP/UNCDF',ruforum:'\u{1F393} RUFORUM',
  yaw_overview:'\u{1F4CA} Overview',yaw_score:'\u{1F3C6} YAW Score',finance_gap:'\u{1F4B3} Finance Gap',value_chains:'\u{1F33E} Value Chains',partners:'\u{1F91D} Partners',yaw_targets:'\u{1F3AF} Targets',
  agriscore:'\u{1F3C6} Agri Score',earlywarning:'\u26A0\uFE0F Warning',food_security:'\u{1F37D}\uFE0F Food Security',price_alert:'\u{1F4B0} Price Alert',
  yaw_dashboard:'\u{1F4CA} YAW Dashboard',farmer_tracking:'\u{1F464} Farmer Tracking',investment_case:'\u{1F4B0} Investment Case',data_partnerships:'\u{1F91D} Data Partnerships',
  eudr_overview:'\u{1F4CB} EUDR Overview',compliance_map:'\u{1F5FA}\uFE0F Compliance Map',coffee_traceability:'\u2615 Traceability',eudr_ai:'\u2728 EUDR AI',
  cn_generator:'\u270D\uFE0F Generate',cn_preview:'\u{1F4C4} Preview',investment_calc:'\u{1F4B0} Investment Calc',data_gaps:'\u{1F4CA} Data Gaps',
  demo_launch:'\u{1F3AF} Launch Demo',
  satellite_ai:'\u{1F6F0}\uFE0F Satellite',soil_ai:'\u{1F9EA} Soil',seed_ai:'\u{1F331} Seed',yield_forecast:'\u{1F4C8} Yield',crop_diagnosis:'\u{1F52C} Diagnosis',market_ai:'\u{1F4B0} Market',farmer_msg:'\u{1F468}\u200D\u{1F33E} Advisory',foundation_strategy:'\u{1F91D} Strategy',ask:'\u{1F4AC} Ask'
};

export var ROLES={
  ps:{name:"PS / Commissioner MAAIF",abbr:"PS",col:"#16a34a",tabs:["production","environment","market","inputs","finance","youth","dairy","programmes","foundation","impact","eudr","concept","datasources","intelligence","ai","demo"]},
  dir_crop:{name:"Dir. Crop Production",abbr:"DC",col:"#15803d",tabs:["production","environment","market","inputs","finance","intelligence","eudr","ai"]},
  dir_pp:{name:"Dir. Plant Protection",abbr:"PP",col:"#dc2626",tabs:["environment","production","intelligence","ai"]},
  naro:{name:"NARO Researcher",abbr:"NR",col:"#7c3aed",tabs:["production","environment","inputs","intelligence","eudr","ai"]},
  coffee:{name:"MAAIF Coffee Unit",abbr:"CU",col:"#92400e",tabs:["market","environment","production","eudr","intelligence","ai"]},
  dao:{name:"District Agri Officer",abbr:"DAO",col:"#475569",tabs:["production","environment","market","inputs","finance","youth","dairy","programmes","foundation","impact","datasources","intelligence","ai"]},
  ext:{name:"Extension Worker",abbr:"EW",col:"#65a30d",tabs:["production","environment","inputs","youth","dairy","programmes","intelligence","ai"]},
  youth_farmer:{name:"Youth Farmer",abbr:"YF",col:"#0891b2",tabs:["youth","dairy","market","inputs","finance","ai"]},
  agro_dealer:{name:"Agro-Dealer",abbr:"AD",col:"#16a34a",tabs:["inputs","market","production","finance","ai"]},
  foundation_staff:{name:"AgriMap Foundation",abbr:"FDN",col:"#16a34a",tabs:["foundation","youth","dairy","programmes","impact","concept","eudr","market","finance","environment","intelligence","ai","demo"]},
  ngo:{name:"NGO / Dev Partner",abbr:"NGO",col:"#0891b2",tabs:["production","environment","market","finance","youth","dairy","programmes","foundation","impact","datasources","intelligence","ai"]},
  agribiz:{name:"Agribusiness / Bank",abbr:"AB",col:"#1d4ed8",tabs:["market","finance","dairy","eudr","production","intelligence","ai"]}
};
