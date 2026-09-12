import styles from "./self-hosted-vpn.module.scss";

const diagrams = {
  network: {
    title: "One VM, three ways in",
    note: "IPv4 traffic through the VPN gateway",
    stages: [
      ["Device", "Laptop or phone", "Applications send traffic into the selected VPN."],
      [
        "Encrypted transport",
        "Across the local network",
        "OpenVPN UDP/1194 or TCP/443 · WireGuard UDP · IKEv2 UDP/500 and NAT-T UDP/4500",
      ],
      [
        "Cloud boundary",
        "OCI public endpoint",
        "Internet gateway, VCN routing and security rules admit the selected transport.",
      ],
      [
        "Ubuntu VM",
        "Decrypt → filter → route",
        "OpenVPN tunnel, WireGuard wg0, or strongSwan IPsec/XFRM policies.",
      ],
      [
        "IPv4 egress",
        "Source NAT → Internet",
        "Ubuntu translates the client address to the VM's private address; OCI maps that to its public IPv4.",
      ],
    ],
    footer:
      "Replies follow connection tracking, reverse translation and the selected encrypted tunnel back to the device. HTTPS remains encrypted between the app and destination.",
  },
  firewall: {
    title: "How Ubuntu handles VPN traffic",
    note: "INPUT → FORWARD → POSTROUTING",
    stages: [
      [
        "01 · INPUT",
        "Reach the VPN endpoint",
        "After cloud filtering, host rules admit encrypted traffic addressed to the local VPN service.",
      ],
      [
        "02 · Decrypt + route",
        "Inspect the inner destination",
        "Traffic addressed to the VM uses INPUT. Internet-bound client traffic needs IP forwarding and a route.",
      ],
      [
        "03 · FORWARD",
        "Permit the intended path",
        "Match the VPN interface or IPsec policy and client pool. Restrict private-network access; allow established replies.",
      ],
      [
        "04 · POSTROUTING",
        "NAT at the IPv4 exit",
        "MASQUERADE Internet-bound private client addresses on the uplink. IPsec-bound traffic needs a policy exemption before a broad NAT rule.",
      ],
      [
        "05 · Return path",
        "Track → filter → encrypt",
        "Conntrack reverses NAT for replies. FORWARD admits permitted return traffic; the VPN sends it to the client.",
      ],
    ],
    footer:
      "Rule order matters: an earlier DROP or REJECT can prevent a later ACCEPT from ever matching. Docker-managed chains must be considered alongside host rules.",
  },
  dco: {
    title: "What data channel offload changes",
    note: "Packet processing with and without offload",
    stages: [
      [
        "Conventional path",
        "Kernel → OpenVPN process → kernel",
        "The userspace process handles data-channel encryption and decryption as packets move through the tunnel.",
      ],
      [
        "DCO path",
        "Kernel networking ↔ DCO data channel",
        "Compatible encrypted data traffic stays in the kernel. OpenVPN still manages authentication, negotiation and keys.",
      ],
      [
        "Server configuration",
        "UDP: DCO-capable · TCP: disable-dco",
        "The installed module supports the UDP performance path; the separately tuned TCP fallback explicitly opts out.",
      ],
    ],
    footer:
      "DCO requires compatible settings and ciphers. OpenVPN logs show whether offload is active for a connection.",
  },
} as const;

export function VpnDiagram({ kind }: { kind: keyof typeof diagrams }) {
  const diagram = diagrams[kind];
  return (
    <figure className={styles.figure}>
      <figcaption>
        <strong>{diagram.title}</strong>
        <span>{diagram.note}</span>
      </figcaption>
      <ol className={styles.flow}>
        {diagram.stages.map(([label, title, detail]) => (
          <li key={label}>
            <span className={styles.label}>{label}</span>
            <strong>{title}</strong>
            <span>{detail}</span>
          </li>
        ))}
      </ol>
      <p className={styles.footer}>{diagram.footer}</p>
    </figure>
  );
}

const protocols = [
  [
    "OpenVPN · UDP",
    "Everyday use",
    "UDP/1194",
    "DCO-capable data path",
    "Requires an OpenVPN client",
  ],
  [
    "OpenVPN · TCP",
    "Restricted networks",
    "TCP/443",
    "Compatibility fallback",
    "TCP-over-TCP can stall under loss",
  ],
  [
    "WireGuard",
    "Speed-focused use",
    "UDP · configured port",
    "Lean kernel tunnel",
    "No native TCP fallback or user/password workflow",
  ],
  [
    "IKEv2 / strongSwan",
    "Easy iPhone setup",
    "UDP/500 + UDP/4500 NAT-T",
    "Native OS client",
    "Certificate identity and UDP reachability matter",
  ],
];

export function VpnProtocolChart() {
  return (
    <figure className={styles.figure}>
      <figcaption>
        <strong>Choosing a VPN protocol</strong>
        <span>Connection options and tradeoffs</span>
      </figcaption>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: The overflowing region must support keyboard scrolling. */}
      <section className={styles.tableScroll} aria-label="VPN protocol comparison" tabIndex={0}>
        <table className={styles.table}>
          <caption className={styles.visuallyHidden}>
            Protocol, use case, transport, advantage and tradeoff
          </caption>
          <thead>
            <tr>
              {["Protocol", "Use case", "Transport", "Main advantage", "Tradeoff"].map(
                (heading) => (
                  <th scope="col" key={heading}>
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {protocols.map(([protocol, ...cells]) => (
              <tr key={protocol}>
                <th scope="row">{protocol}</th>
                {cells.map((cell) => (
                  <td key={cell}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </figure>
  );
}
