async function run() {
  const url1 = "https://scontent.fbfh8-2.fna.fbcdn.net/v/t45.5328-4/773417815_1097414616283459_6669581727847290550_n.jpg?stp=dst-jpg_p960x960_tt6&_nc_cat=111&ccb=1-7&_nc_sid=247b10&_nc_eui2=AeHlFEJxeGShebLqPZhMXHA9JCGS5Io_3jskIZLkij_eO6I89cqcg6em5kuTep2FseZR-7Wuom3GJeOttzChEWHN&_nc_ohc=dizszTMPmZgQ7kNvwG_Th0F&_nc_oc=AdpbJEpSLWBzG5Rv2r8-MAXnqqKQQ46g3PzSiYg4vjAgpSSW_rLbFJEiq07pymUo92_2ZRi6mZwqtGQRadCZ0nPW&_nc_zt=23&_nc_ht=scontent.fbfh8-2.fna&_nc_gid=C-THcVpJhpNUpV5YdduHsg&_nc_ss=7b2a8&oh=00_AQEYpdzIr_MeGV_l_uKVM1izYPlWQWg-5Gqk5FsNS2GfrA&oe=6A862DD4"
  const url2 = "https://scontent.fbfh8-1.fna.fbcdn.net/v/t45.5328-4/773493118_1696086955011050_9221634466041667123_n.jpg?stp=dst-jpg_p960x960_tt6&_nc_cat=104&ccb=1-7&_nc_sid=247b10&_nc_eui2=AeGuehwRRjhiL_6IIsLB1UuTBa9peTV6EIoFr2l5NXoQisDjIp0JIZirNd8aUzqcemlkgoUFY13LhfsJ0g2S9x4I&_nc_ohc=Ue7Om0jrZTUQ7kNvwFwGWhE&_nc_oc=Adqr148y0g4xxc8amMT8lFxTRErSp8okCJV3APPuIRPpwU4n9ucp6OtSJqYIwRsytJQqdWXU4f6FRoI1oiGyVJkq&_nc_zt=23&_nc_ht=scontent.fbfh8-1.fna&_nc_gid=C-THcVpJhpNUpV5YdduHsg&_nc_ss=7b2a8&oh=00_AQHofw-LbkPSRUXfEMzvpItn1bVSeF16A5Rf73z33OvT1w&oe=6A864492"

  console.log("Iniciando requisições...")
  
  try {
    const [res1, res2] = await Promise.all([
      fetch(url1, { method: 'HEAD' }),
      fetch(url2, { method: 'HEAD' })
    ])
    
    console.log("Imagem 1:")
    console.log("Status:", res1.status)
    console.log("Content-Type:", res1.headers.get("content-type"))
    console.log("Content-Length (Tamanho):", res1.headers.get("content-length"), "bytes")
    
    console.log("\nImagem 2:")
    console.log("Status:", res2.status)
    console.log("Content-Type:", res2.headers.get("content-type"))
    console.log("Content-Length (Tamanho):", res2.headers.get("content-length"), "bytes")
    
  } catch (err: any) {
    console.error("Erro na requisição:", err.message)
  }
}

run()
