export interface CampusTransitStop {name:string;url:string;routes:{type:'bus'|'tram'|'trolleybus';number:string}[];sourceUrl:string;checkedAt:string;bothDirections?:boolean;references?:string[];platformNote?:string;}
export interface CampusTransit {id:string;metroLabel?:string;metro:{name:string;note:string}[];stops:CampusTransitStop[];rail?:string;notes:string[];checkedAt:string;}
export const CAMPUS_TRANSIT:CampusTransit[]=[
  {
    "id": "school",
    "metro": [
      {
        "name": "Удельная",
        "note": "Удобный подход пешком от метро и железнодорожной станции."
      },
      {
        "name": "Пионерская",
        "note": ""
      }
    ],
    "stops": [
      {
        "name": "Центр имени Алмазова",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10068911/",
        "routes": [
          {
            "type": "bus",
            "number": "85"
          },
          {
            "type": "bus",
            "number": "112"
          },
          {
            "type": "bus",
            "number": "208"
          },
          {
            "type": "bus",
            "number": "279"
          }
        ],
        "sourceUrl": "https://yandex.com/maps/2/saint-petersburg/stops/stop__10068911/",
        "checkedAt": "2026-11-27"
      },
      {
        "name": "Центр имени Алмазова (по требованию)",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/4659890063/",
        "routes": [
          {
            "type": "bus",
            "number": "38"
          },
          {
            "type": "bus",
            "number": "40"
          },
          {
            "type": "bus",
            "number": "45"
          },
          {
            "type": "bus",
            "number": "219"
          }
        ],
        "sourceUrl": "https://yandex.com/maps/2/saint-petersburg/stops/4659890063/",
        "checkedAt": "2026-11-27"
      },
      {
        "name": "Коломяжский проспект",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10069219/",
        "routes": [
          {
            "type": "bus",
            "number": "9"
          },
          {
            "type": "bus",
            "number": "127"
          },
          {
            "type": "bus",
            "number": "134Б"
          },
          {
            "type": "bus",
            "number": "135"
          },
          {
            "type": "bus",
            "number": "171"
          },
          {
            "type": "bus",
            "number": "172"
          },
          {
            "type": "bus",
            "number": "235"
          },
          {
            "type": "bus",
            "number": "267"
          },
          {
            "type": "bus",
            "number": "279"
          }
        ],
        "sourceUrl": "https://yandex.com/maps/2/saint-petersburg/stops/stop__10069219/",
        "checkedAt": "2026-11-27"
      }
    ],
    "notes": [
      "После поездки найдите проходную Школы на Аккуратова. Фотоориентиры — во вкладке «Вход в корпус»."
    ],
    "checkedAt": "2026-11-27"
  },
  {
    "id": "tower",
    "metro": [
      {
        "name": "Удельная",
        "note": ""
      },
      {
        "name": "Пионерская",
        "note": ""
      }
    ],
    "stops": [
      {
        "name": "Центр имени Алмазова",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10068911/",
        "routes": [
          {
            "type": "bus",
            "number": "85"
          },
          {
            "type": "bus",
            "number": "112"
          },
          {
            "type": "bus",
            "number": "208"
          },
          {
            "type": "bus",
            "number": "279"
          }
        ],
        "sourceUrl": "https://yandex.com/maps/2/saint-petersburg/stops/stop__10068911/",
        "checkedAt": "2026-11-27"
      },
      {
        "name": "Центр имени Алмазова (по требованию)",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/4659890063/",
        "routes": [
          {
            "type": "bus",
            "number": "38"
          },
          {
            "type": "bus",
            "number": "40"
          },
          {
            "type": "bus",
            "number": "45"
          },
          {
            "type": "bus",
            "number": "219"
          }
        ],
        "sourceUrl": "https://yandex.com/maps/2/saint-petersburg/stops/4659890063/",
        "checkedAt": "2026-11-27"
      },
      {
        "name": "Коломяжский проспект",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10069219/",
        "routes": [
          {
            "type": "bus",
            "number": "9"
          },
          {
            "type": "bus",
            "number": "127"
          },
          {
            "type": "bus",
            "number": "134Б"
          },
          {
            "type": "bus",
            "number": "135"
          },
          {
            "type": "bus",
            "number": "171"
          },
          {
            "type": "bus",
            "number": "172"
          },
          {
            "type": "bus",
            "number": "235"
          },
          {
            "type": "bus",
            "number": "267"
          },
          {
            "type": "bus",
            "number": "279"
          }
        ],
        "sourceUrl": "https://yandex.com/maps/2/saint-petersburg/stops/stop__10069219/",
        "checkedAt": "2026-11-27"
      }
    ],
    "notes": [
      "Башня и ГКК находятся на одной территории. После проходной сверьте нужный корпус и аудиторию."
    ],
    "checkedAt": "2026-11-27"
  },
  {
    "id": "imo",
    "metro": [
      {
        "name": "Пионерская",
        "note": ""
      },
      {
        "name": "Удельная",
        "note": ""
      }
    ],
    "stops": [
      {
        "name": "Проспект Королёва",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10072958/",
        "routes": [
          {
            "type": "bus",
            "number": "9"
          },
          {
            "type": "bus",
            "number": "127"
          },
          {
            "type": "bus",
            "number": "134А"
          },
          {
            "type": "bus",
            "number": "135"
          },
          {
            "type": "bus",
            "number": "171"
          },
          {
            "type": "bus",
            "number": "172"
          },
          {
            "type": "bus",
            "number": "235"
          },
          {
            "type": "bus",
            "number": "267"
          },
          {
            "type": "bus",
            "number": "279"
          }
        ],
        "sourceUrl": "https://yandex.kz/maps/ru/2/saint-petersburg/stops/stop__10072958/?lang=ru",
        "checkedAt": "2026-11-27"
      },
      {
        "name": "Проспект Королёва — Поликлиника",
        "url": "https://yandex.ru/maps/?text=%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3%2C%20%D0%BE%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0%20%D0%9F%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82%20%D0%9A%D0%BE%D1%80%D0%BE%D0%BB%D1%91%D0%B2%D0%B0%20%E2%80%94%20%D0%9F%D0%BE%D0%BB%D0%B8%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B0",
        "bothDirections": true,
        "routes": [
          {
            "type": "trolleybus",
            "number": "25"
          },
          {
            "type": "trolleybus",
            "number": "50"
          },
          {
            "type": "bus",
            "number": "79"
          },
          {
            "type": "bus",
            "number": "134А"
          },
          {
            "type": "bus",
            "number": "134Б"
          },
          {
            "type": "bus",
            "number": "170"
          },
          {
            "type": "bus",
            "number": "184"
          },
          {
            "type": "bus",
            "number": "202"
          },
          {
            "type": "bus",
            "number": "227"
          },
          {
            "type": "bus",
            "number": "237"
          }
        ],
        "sourceUrl": "https://ru.wikiroutes.info/stops/13948",
        "checkedAt": "2026-11-27",
        "references": [
          "https://guzgp102.rprim.gov.spb.ru/svedeniya-o-meditsinskoj-organizatsii/",
          "https://yandex.kz/maps/ru/2/saint-petersburg/stops/stop__10072972/?lang=ru"
        ],
        "platformNote": "Общий список для обеих сторон проспекта. Выберите сторону посадки в Картах."
      }
    ],
    "notes": [
      "От Пионерской можно пройти к площадке пешком. ИМО и соседний ДЛРК имеют разные входы."
    ],
    "checkedAt": "2026-11-27"
  },
  {
    "id": "cdti",
    "metro": [
      {
        "name": "Комендантский проспект",
        "note": ""
      },
      {
        "name": "Удельная",
        "note": ""
      },
      {
        "name": "Пионерская",
        "note": ""
      }
    ],
    "stops": [
      {
        "name": "Улица Маршала Новикова / Вербная улица",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10066471/",
        "routes": [
          {
            "type": "bus",
            "number": "40"
          },
          {
            "type": "bus",
            "number": "127"
          },
          {
            "type": "bus",
            "number": "219"
          }
        ],
        "sourceUrl": "https://yandex.kz/maps/2/saint-petersburg/stops/stop__10066471/",
        "checkedAt": "2026-11-28"
      },
      {
        "name": "Долгоозёрная улица / Парашютная улица",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10067301/",
        "routes": [
          {
            "type": "bus",
            "number": "9"
          },
          {
            "type": "bus",
            "number": "135"
          },
          {
            "type": "bus",
            "number": "171"
          },
          {
            "type": "bus",
            "number": "184"
          },
          {
            "type": "bus",
            "number": "194"
          },
          {
            "type": "bus",
            "number": "221"
          },
          {
            "type": "bus",
            "number": "267"
          }
        ],
        "sourceUrl": "https://yandex.kz/maps/2/saint-petersburg/stops/stop__10067301/",
        "checkedAt": "2026-11-28",
        "platformNote": "Сторона, где автобус 221 идёт к Аэродромной улице."
      },
      {
        "name": "Долгоозёрная улица / Парашютная улица",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10067300/",
        "routes": [
          {
            "type": "bus",
            "number": "9"
          },
          {
            "type": "bus",
            "number": "135"
          },
          {
            "type": "bus",
            "number": "171"
          },
          {
            "type": "bus",
            "number": "180"
          },
          {
            "type": "bus",
            "number": "194"
          },
          {
            "type": "bus",
            "number": "219"
          },
          {
            "type": "bus",
            "number": "221"
          },
          {
            "type": "bus",
            "number": "267"
          },
          {
            "type": "trolleybus",
            "number": "52"
          }
        ],
        "sourceUrl": "https://yandex.uz/maps/2/saint-petersburg/stops/stop__10067300/",
        "checkedAt": "2026-11-28",
        "platformNote": "Сторона, где автобус 221 идёт к Северному кладбищу."
      },
      {
        "name": "Парашютная улица / Долгоозёрная улица",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10067302/",
        "routes": [
          {
            "type": "trolleybus",
            "number": "52"
          },
          {
            "type": "bus",
            "number": "180"
          },
          {
            "type": "bus",
            "number": "184"
          }
        ],
        "sourceUrl": "https://yandex.kz/maps/2/saint-petersburg/stops/stop__10067302/",
        "checkedAt": "2026-11-28",
        "platformNote": "На Долгоозёрной улице · троллейбус 52 к Старой Деревне."
      },
      {
        "name": "Вербная улица / Репищева улица",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10066472/",
        "routes": [
          {
            "type": "bus",
            "number": "122"
          },
          {
            "type": "bus",
            "number": "127"
          },
          {
            "type": "bus",
            "number": "134Б"
          },
          {
            "type": "bus",
            "number": "170"
          },
          {
            "type": "bus",
            "number": "172"
          },
          {
            "type": "bus",
            "number": "182"
          },
          {
            "type": "bus",
            "number": "208"
          },
          {
            "type": "bus",
            "number": "235"
          },
          {
            "type": "bus",
            "number": "237"
          }
        ],
        "sourceUrl": "https://yandex.kz/maps/2/saint-petersburg/stops/stop__10066472/",
        "checkedAt": "2026-11-28"
      },
      {
        "name": "Репищева улица / Вербная улица",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10076926/",
        "routes": [
          {
            "type": "bus",
            "number": "40"
          },
          {
            "type": "bus",
            "number": "134А"
          },
          {
            "type": "bus",
            "number": "182"
          },
          {
            "type": "bus",
            "number": "219"
          },
          {
            "type": "bus",
            "number": "237"
          }
        ],
        "sourceUrl": "https://yandex.com/maps/2/saint-petersburg/stops/stop__10076926/",
        "checkedAt": "2026-11-27"
      }
    ],
    "notes": [
      "Выберите остановку и проверьте направление: остановки на разных сторонах улицы обслуживают разные маршруты."
    ],
    "checkedAt": "2026-11-27"
  },
  {
    "id": "sunny",
    "metroLabel": "Метро для поездки из города",
    "metro": [
      {
        "name": "Чёрная речка",
        "note": "Автобусы 211 и 211Э в сторону Зеленогорска."
      },
      {
        "name": "Удельная",
        "note": "Электричка до станции Солнечное."
      },
      {
        "name": "Площадь Ленина",
        "note": "Электричка с Финляндского вокзала до Солнечного."
      }
    ],
    "stops": [
      {
        "name": "Солнечное — Улица Танкистов",
        "url": "https://yandex.ru/maps/?text=%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3%2C%20%D0%A1%D0%BE%D0%BB%D0%BD%D0%B5%D1%87%D0%BD%D0%BE%D0%B5%2C%20%D0%BE%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0%20%D0%A3%D0%BB%D0%B8%D1%86%D0%B0%20%D0%A2%D0%B0%D0%BD%D0%BA%D0%B8%D1%81%D1%82%D0%BE%D0%B2%2C%20%D0%9F%D1%80%D0%B8%D0%BC%D0%BE%D1%80%D1%81%D0%BA%D0%BE%D0%B5%20%D1%88%D0%BE%D1%81%D1%81%D0%B5",
        "bothDirections": true,
        "routes": [
          {
            "type": "bus",
            "number": "211"
          },
          {
            "type": "bus",
            "number": "211Э"
          },
          {
            "type": "bus",
            "number": "680"
          }
        ],
        "sourceUrl": "https://ru.wikiroutes.info/stops/12639",
        "checkedAt": "2026-11-27"
      }
    ],
    "rail": "Электричка до железнодорожной станции Солнечное. Посадка возможна на Финляндском вокзале, Ланской или Удельной; выбирайте поезд с остановкой в Солнечном.",
    "notes": [
      "После автобуса идите к кампусу по улице Танкистов. После электрички используйте оборудованные переходы и фотоориентиры.",
      "Для автобуса 680 отдельно проверьте перевозчика, тариф и точку посадки."
    ],
    "checkedAt": "2026-11-27"
  },
  {
    "id": "nok",
    "metro": [
      {
        "name": "Пионерская",
        "note": ""
      },
      {
        "name": "Удельная",
        "note": ""
      }
    ],
    "stops": [
      {
        "name": "Проспект Королёва",
        "url": "https://yandex.ru/maps/2/saint-petersburg/stops/stop__10072958/",
        "routes": [
          {
            "type": "bus",
            "number": "9"
          },
          {
            "type": "bus",
            "number": "127"
          },
          {
            "type": "bus",
            "number": "134А"
          },
          {
            "type": "bus",
            "number": "135"
          },
          {
            "type": "bus",
            "number": "171"
          },
          {
            "type": "bus",
            "number": "172"
          },
          {
            "type": "bus",
            "number": "235"
          },
          {
            "type": "bus",
            "number": "267"
          },
          {
            "type": "bus",
            "number": "279"
          }
        ],
        "sourceUrl": "https://yandex.kz/maps/ru/2/saint-petersburg/stops/stop__10072958/?lang=ru",
        "checkedAt": "2026-11-27"
      },
      {
        "name": "Проспект Королёва — Поликлиника",
        "url": "https://yandex.ru/maps/?text=%D0%A1%D0%B0%D0%BD%D0%BA%D1%82-%D0%9F%D0%B5%D1%82%D0%B5%D1%80%D0%B1%D1%83%D1%80%D0%B3%2C%20%D0%BE%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0%20%D0%9F%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82%20%D0%9A%D0%BE%D1%80%D0%BE%D0%BB%D1%91%D0%B2%D0%B0%20%E2%80%94%20%D0%9F%D0%BE%D0%BB%D0%B8%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B0",
        "bothDirections": true,
        "routes": [
          {
            "type": "trolleybus",
            "number": "25"
          },
          {
            "type": "trolleybus",
            "number": "50"
          },
          {
            "type": "bus",
            "number": "79"
          },
          {
            "type": "bus",
            "number": "134А"
          },
          {
            "type": "bus",
            "number": "134Б"
          },
          {
            "type": "bus",
            "number": "170"
          },
          {
            "type": "bus",
            "number": "184"
          },
          {
            "type": "bus",
            "number": "202"
          },
          {
            "type": "bus",
            "number": "227"
          },
          {
            "type": "bus",
            "number": "237"
          }
        ],
        "sourceUrl": "https://ru.wikiroutes.info/stops/13948",
        "checkedAt": "2026-11-27",
        "references": [
          "https://guzgp102.rprim.gov.spb.ru/svedeniya-o-meditsinskoj-organizatsii/",
          "https://yandex.kz/maps/ru/2/saint-petersburg/stops/stop__10072972/?lang=ru"
        ],
        "platformNote": "Общий список для обеих сторон проспекта. Выберите сторону посадки в Картах."
      }
    ],
    "notes": [
      "Перед первым посещением уточните действующий вход в НОК: в исходной презентации комплекс показан во время строительства."
    ],
    "checkedAt": "2026-11-27"
  }
];
export function transitForCampus(id:string){return CAMPUS_TRANSIT.find(t=>t.id===id);}
