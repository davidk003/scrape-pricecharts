    import { json } from '@sveltejs/kit';

    const regex = /VGPC\.chart_data = \{(.*?)\};/s;
    const regex2 = /VGPC\.volume_data = \{(.*?)\};/s;
export async function GET({ url  }) {
    let ret: any = undefined;
    let PCId = url.searchParams?.get("id");
    if (!PCId) {
        return json({ error: "Invalid PCId provided" });
    }
    let fetchUrl = `https://www.pricecharting.com/game/${PCId}`;
    //Set header to be text/html to get the full page
    let headers = new Headers();
    headers.append("Accept", "text/html");
    headers.append("cookie", "vgpc_session=r%2FDt5HLacefybutgr%2B1aFWOs6zkENoQM2rGHYIYX0djK3WquyzfJVXaOtPYD;");
    await fetch(fetchUrl, {
        method: "GET",
        headers: headers
    })
    .then( async (response) => {
        return response.text();
    })
    .then(async (data) => {
        let chart_data = data.match(regex);
        if (chart_data){
            // console.log(chart_data[1]);
            ret = JSON.parse("{" +  chart_data[1] + "}");

            let pokemonGradingMap : Map<string, string> = new Map( [
                ["Ungraded", "used"],
                ["PSA7", "cib"],
                ["PSA8", "new"],
                ["PSA9", "graded"],
                ["BGS9.5", "boxonly"],
                ["PSA10", "manualonly"],
            ]);

            pokemonGradingMap.forEach((value, key) => {
                if (ret[value]) {
                    // console.log(value)
                    ret[key] = ret[value];
                    delete ret[value];
                }
            });
        }
        let volume_data = data.match(regex2);
        if (volume_data){
            // console.log(volume_data[1]);
            if (ret){
                ret.volume_data = JSON.parse("{" +  volume_data[1] + "}");
            }
            else
            {
                ret = JSON.parse("{" +  volume_data[1] + "}");
            }
        }

    })
    .catch((error) => console.error(error));

	return json({ret });
}
